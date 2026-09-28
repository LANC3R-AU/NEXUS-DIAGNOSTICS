import { useEffect, useState } from 'react';
import { Activity, CarFront, Gauge, LayoutDashboard, ScanLine, FileText, Settings, PlugZap, CircleAlert } from 'lucide-react';
import './App.css';
import { loadVehicles, saveVehicles, loadScans, saveScans } from './diagnostics/garage';
import type { Vehicle, SavedScan } from './diagnostics/garage';
import { decodeMode01Frame } from './diagnostics/obd2';
import { adapterManager } from './diagnostics/AdapterManager';
import type { Reading, Fault, ModuleResult } from './diagnostics/types';

type Page = 'Dashboard' | 'Vehicle Scan' | 'Trouble Codes' | 'Live Data' | 'Reports' | 'Garage' | 'Settings';
const menu: { name: Page; icon: typeof Activity }[] = [
  { name:'Dashboard',icon:LayoutDashboard }, { name:'Vehicle Scan',icon:ScanLine },
  { name:'Trouble Codes',icon:CircleAlert }, { name:'Live Data',icon:Gauge },
  { name:'Reports',icon:FileText }, { name:'Garage',icon:CarFront }, { name:'Settings',icon:Settings }
];
const initial:Reading={rpm:820,speed:0,coolant:89,voltage:14.1};
const initialFaults:Fault[] = [
  {code:'P0300',description:'Random/multiple cylinder misfire detected',status:'Stored'},
  {code:'P0133',description:'Oxygen sensor circuit slow response (Bank 1 Sensor 1)',status:'Pending'}
];
const fmt=(n:number,decimals=0)=>n.toFixed(decimals);
export default function App(){
  const [vehicles,setVehicles]=useState<Vehicle[]>(loadVehicles);
  const [scans,setScans]=useState<SavedScan[]>(loadScans);
  const [vehicleId,setVehicleId]=useState('');
  const [newVehicle,setNewVehicle]=useState({name:'',year:'',make:'',model:'',notes:''});
  const [decoded,setDecoded]=useState('');
  const [page,setPage]=useState<Page>('Dashboard');
  const [demo,setDemo]=useState(false);
  const [running,setRunning]=useState(false);
  const [readings,setReadings]=useState<Reading>(initial);
  const [faults,setFaults]=useState<Fault[]>(initialFaults);
  const [scanned,setScanned]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [scanResult,setScanResult]=useState<ModuleResult[]>([]);
  const [selectedModules,setSelectedModules]=useState<string[]>(['engine','transmission','abs','srs']);
  const [history,setHistory]=useState<{time:string;readings:Reading}[]>([]);
  useEffect(()=>{
    if(!demo||!running)return;
    let cancelled=false;
    const timer=window.setInterval(()=>{
      const adapter=adapterManager.adapter;
      if(adapter)void adapter.readTelemetry().then(data=>{if(!cancelled){setReadings(data);setHistory(h=>[...h.slice(-39),{time:new Date().toLocaleTimeString(),readings:data}]);}}).catch(e=>setError(String(e)));
    },1000);
    return ()=>{cancelled=true;window.clearInterval(timer);};
  },[demo,running]);
  async function toggleDemo(){
    setBusy(true);setError('');
    try{
      if(demo){setRunning(false);await adapterManager.disconnect();setDemo(false);setScanned(false);setScanResult([]);setHistory([]);setReadings(initial);}
      else {await adapterManager.connect('virtual-lancer');setDemo(true);setReadings(initial);setFaults(await adapterManager.virtualAdapter.readFaults());setScanned(false);setScanResult([]);setHistory([]);}
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function runScan(){
    setBusy(true);setError('');
    try{
      const adapter=adapterManager.adapter;
      if(!adapter)throw new Error('Start the simulator first');
      const modules=await adapter.scanModules();
      setScanResult(modules.filter(m=>selectedModules.includes(m.id)));
      setFaults(await adapter.readFaults());
      setScanned(true);
      if(vehicleId){
        const entry:SavedScan={id:crypto.randomUUID(),vehicleId,timestamp:new Date().toISOString(),modules:modules.filter(m=>selectedModules.includes(m.id)),faults:await adapter.readFaults(),mode:'simulation'};
        setScans(old=>{const next=[entry,...old];saveScans(next);return next;});
      }
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  function exportReport(){
    const report={application:'NEXUS DIAGNOSTICS',version:'0.5.0',mode:'SIMULATION ONLY',created:new Date().toISOString(),vehicle:'Example 2009 Mitsubishi Lancer 4B11 CVT',modules:scanResult,faults,readings,history};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='nexus-simulation-report.json';link.click();URL.revokeObjectURL(url);
  }
  async function clearFaults(){try{await adapterManager.virtualAdapter.clearDemoFaults();setFaults(await adapterManager.virtualAdapter.readFaults());}catch(e){setError(String(e));}}
  async function restoreFaults(){try{await adapterManager.virtualAdapter.restoreDemoFaults();setFaults(await adapterManager.virtualAdapter.readFaults());}catch(e){setError(String(e));}}
  const metrics=[
    {label:'ENGINE SPEED',value:fmt(readings.rpm),unit:'RPM'},
    {label:'VEHICLE SPEED',value:fmt(readings.speed),unit:'km/h'},
    {label:'COOLANT TEMP',value:fmt(readings.coolant,1),unit:'°C'},
    {label:'BATTERY VOLTAGE',value:fmt(readings.voltage,1),unit:'V'}
  ];
  const metricGrid=<div className="metrics">{metrics.map(m=><article className="metric" key={m.label}><div className="metric-label"><Activity size={17}/>{m.label}</div><div className="metric-value">{demo?m.value:'--'} <small>{m.unit}</small></div><div className="metric-footer">{demo?'SIMULATED • NOT LIVE':'NO SIGNAL'}</div></article>)}</div>;
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">N</div><div><strong>NEXUS</strong><small>DIAGNOSTICS</small></div></div><div className="nav-label">WORKSPACE</div>
      <nav>{menu.map(({name,icon:Icon})=><button key={name} className={page===name?'nav active':'nav'} onClick={()=>setPage(name)}><Icon size={19}/>{name}</button>)}</nav>
      <div className="sidebar-bottom"><span className="status-dot"/> {demo?'SIMULATION ACTIVE':'HARDWARE DISCONNECTED'}<small>Version 0.5.0 • SIMULATION</small></div>
    </aside>
    <main className="main">{error&&<section className="info" role="alert">{error}</section>}<header><div><div className="eyebrow">NEXUS / WORKSPACE</div><h1>{page}</h1><p>Automotive diagnostic workstation</p></div><span className={demo?'pill demo':'pill'}>{demo?'● SIMULATION ONLY':'○ NOT CONNECTED'}</span></header>
    {page==='Dashboard'&&<><section className="hero"><div><div className="eyebrow">VEHICLE CONNECTION</div><h2>{demo?'2009 Mitsubishi Lancer • Virtual ECU':'No vehicle connected'}</h2><p>{demo?'Synthetic demonstration data. No physical ECU or adapter is connected.':'Launch the simulator to explore diagnostics without hardware.'}</p><button className="primary" onClick={()=>void toggleDemo()} disabled={busy}>{demo?'Exit simulation':'Launch simulator'} →</button></div><CarFront className="hero-car" size={170} strokeWidth={0.7}/></section><div className="section-title"><h3>Vehicle telemetry</h3><span>{demo?'SIMULATED DATA':'AWAITING CONNECTION'}</span></div>{metricGrid}<section className="info"><PlugZap size={22}/><div><strong>Hardware integration is disabled</strong><p>All displayed values and faults are fictional test data. Never use them for actual vehicle diagnosis.</p></div></section></>}
    {page==='Vehicle Scan'&&<section className="panel"><h2>Virtual full-system scan</h2><p>Example 2009 Mitsubishi Lancer • 4B11 • CVT. Module responses are synthetic.</p><label className='field-label'>Save scan under garage vehicle (optional)<select value={vehicleId} onChange={e=>setVehicleId(e.target.value)}><option value=''>Do not save</option>{vehicles.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><div className="module-grid">{[['engine','Engine ECU'],['transmission','Transmission Control'],['abs','ABS Module'],['srs','SRS Airbag Module']].map(([id,name])=><label className="module-option" key={id}><input type="checkbox" checked={selectedModules.includes(id)} onChange={e=>setSelectedModules(current=>e.target.checked?[...current,id]:current.filter(x=>x!==id))}/>{name}</label>)}</div><button className="primary" disabled={!demo||busy||selectedModules.length===0} onClick={()=>void runScan()}>Scan selected modules</button>{!demo&&<p>Launch the simulator from Dashboard first.</p>}{demo&&scanned&&<div className="scan-result"><strong>Simulated scan complete</strong><div className="fault-list">{scanResult.map(m=><div className="fault" key={m.id}><strong>{m.module}</strong><span>{m.status}</span><small>{m.faults} example fault(s)</small></div>)}</div></div>}</section>}
    {page==='Trouble Codes'&&<section className="panel"><h2>Demonstration fault codes</h2><p>These codes are sample scenarios, not faults detected on your vehicle.</p>{demo?<><div className="fault-list">{faults.length?faults.map(f=><div className="fault" key={f.code}><strong>{f.code}</strong><span>{f.description}</span><small>{f.status} • SIMULATED</small></div>):<p>No demonstration faults stored.</p>}</div><button className="secondary" onClick={()=>void clearFaults()}>Clear simulated codes</button><button className="secondary" onClick={()=>void restoreFaults()}>Restore sample codes</button></>:<p>Start simulation to view sample faults.</p>}</section>}
    {page==='Live Data'&&<section className="panel"><h2>Live data simulator</h2><p>Synthetic values update every second. Charts display the most recent 40 samples.</p>{metricGrid}<div className="button-row"><button className="primary" disabled={!demo} onClick={()=>setRunning(!running)}>{running?'Pause simulation':'Start changing readings'}</button><button className="secondary" disabled={!demo} onClick={()=>{setRunning(false);setHistory([]);setReadings(initial);}}>Reset readings</button></div>{history.length>1&&<div className="chart-grid">{([['rpm','RPM',4500],['speed','Speed km/h',110],['coolant','Coolant °C',110],['voltage','Voltage',16]] as const).map(([key,label,max])=><div className="chart-card" key={key}><strong>{label}</strong><svg viewBox="0 0 360 120" role="img" aria-label={`Simulated ${label} history`} preserveAspectRatio="none"><polyline fill="none" stroke="#e54852" strokeWidth="2.5" points={history.map((sample,i)=>`${i*360/39},${110-(sample.readings[key]/max)*100}`).join(' ')}/></svg></div>)}</div>}</section>}
    {page==='Reports'&&<section className="panel"><h2>Simulation reports</h2><p>Export a JSON report with the current synthetic readings, faults, scan results and recent telemetry samples.</p><button className="primary" disabled={!demo} onClick={exportReport}>Export simulation report (.json)</button><p>Reports are explicitly marked SIMULATION ONLY. No actual vehicle information is collected.</p></section>}
    {page==='Garage'&&<section className="panel"><h2>Vehicle Garage</h2><p>Profiles are stored locally on this computer. No VIN lookup or hardware identification is active.</p><form className="garage-form" onSubmit={e=>{e.preventDefault();if(!newVehicle.name.trim())return;const next=[...vehicles,{...newVehicle,id:crypto.randomUUID()}];setVehicles(next);saveVehicles(next);setNewVehicle({name:'',year:'',make:'',model:'',notes:''});}}>{(['name','year','make','model','notes'] as const).map(key=><label className="field-label" key={key}>{key}<input value={newVehicle[key]} onChange={e=>setNewVehicle(old=>({...old,[key]:e.target.value}))} required={key==='name'} placeholder={key==='name'?'My Lancer':key}/></label>)}<button className="primary" type="submit">Add vehicle</button></form><div className="fault-list">{vehicles.map(v=><div className="garage-card" key={v.id}><strong>{v.name}</strong><p>{[v.year,v.make,v.model].filter(Boolean).join(' ')} {v.notes&&`• ${v.notes}`}</p><small>{scans.filter(x=>x.vehicleId===v.id).length} saved simulated scan(s)</small><div className="button-row"><button className="secondary" onClick={()=>{setVehicleId(v.id);setPage('Vehicle Scan');}}>Scan this profile</button><button className="secondary" onClick={()=>{if(window.confirm('Delete this vehicle and its saved simulated scans?')){const next=vehicles.filter(x=>x.id!==v.id);const history=scans.filter(x=>x.vehicleId!==v.id);setVehicles(next);saveVehicles(next);setScans(history);saveScans(history);if(vehicleId===v.id)setVehicleId('');}}}>Delete</button></div>{scans.filter(x=>x.vehicleId===v.id).map(scan=><div className="scan-result" key={scan.id}><strong>{new Date(scan.timestamp).toLocaleString()} • SIMULATED</strong><p>{scan.modules.length} module(s), {scan.faults.length} sample engine fault(s)</p></div>)}</div>)}</div></section>}
    {page==='Settings'&&<section className="panel"><h2>Adapter manager</h2><p>Hardware adapters are not enabled in this build.</p><p>Current mode: {demo?'Virtual ECU simulation':'Disconnected'}</p><p>Adapter options:</p>{adapterManager.listAdapters().map(a=><div className="fault" key={a.id}><strong>{a.name}</strong><span>{a.available?(demo?"Connected to simulator":"Available — launch from Dashboard"):"Unavailable — driver not implemented"}</span></div>)}<p>Physical J2534 detection and read-only OBD-II are planned, not operational.</p><h3>Offline OBD-II decoder self-check</h3><p>Decode a hardcoded sample Mode 01 RPM frame (41 0C 1A F8). No adapter or vehicle commands.</p><button className="secondary" onClick={()=>{try{const r=decodeMode01Frame([0x41,0x0c,0x1a,0xf8]);setDecoded(`${r.value} RPM (synthetic sample)`);}catch(e){setDecoded(String(e));}}}>Decode sample frame</button>{decoded&&<p>{decoded}</p>}</section>}
    </main>
  </div>;
}
