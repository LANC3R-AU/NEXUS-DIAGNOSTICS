import { useEffect, useState } from 'react';
import { Activity, CarFront, Gauge, LayoutDashboard, ScanLine, FileText, Settings, PlugZap, CircleAlert } from 'lucide-react';
import './App.css';
import { adapterManager } from './diagnostics/AdapterManager';
import type { Reading, Fault } from './diagnostics/types';

type Page = 'Dashboard' | 'Vehicle Scan' | 'Trouble Codes' | 'Live Data' | 'Reports' | 'Settings';
const menu: { name: Page; icon: typeof Activity }[] = [
  { name:'Dashboard',icon:LayoutDashboard }, { name:'Vehicle Scan',icon:ScanLine },
  { name:'Trouble Codes',icon:CircleAlert }, { name:'Live Data',icon:Gauge },
  { name:'Reports',icon:FileText }, { name:'Settings',icon:Settings }
];
const initial:Reading={rpm:820,speed:0,coolant:89,voltage:14.1};
const initialFaults:Fault[] = [
  {code:'P0300',description:'Random/multiple cylinder misfire detected',status:'Stored'},
  {code:'P0133',description:'Oxygen sensor circuit slow response (Bank 1 Sensor 1)',status:'Pending'}
];
const fmt=(n:number,decimals=0)=>n.toFixed(decimals);
export default function App(){
  const [page,setPage]=useState<Page>('Dashboard');
  const [demo,setDemo]=useState(false);
  const [running,setRunning]=useState(false);
  const [readings,setReadings]=useState<Reading>(initial);
  const [faults,setFaults]=useState<Fault[]>(initialFaults);
  const [scanned,setScanned]=useState(false);
  const [reports,setReports]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [scanResult,setScanResult]=useState('');
  useEffect(()=>{
    if(!demo||!running)return;
    let cancelled=false;
    const timer=window.setInterval(()=>{
      const adapter=adapterManager.adapter;
      if(adapter)void adapter.readTelemetry().then(data=>{if(!cancelled)setReadings(data);}).catch(e=>setError(String(e)));
    },1000);
    return ()=>{cancelled=true;window.clearInterval(timer);};
  },[demo,running]);
  async function toggleDemo(){
    setBusy(true);setError('');
    try{
      if(demo){setRunning(false);await adapterManager.disconnect();setDemo(false);setScanned(false);setReadings(initial);}
      else {await adapterManager.connect('virtual-lancer');setDemo(true);setReadings(initial);setFaults(await adapterManager.virtualAdapter.readFaults());setScanned(false);}
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function runScan(){try{const result=await adapterManager.adapter?.scanModules();setFaults(await adapterManager.adapter!.readFaults());setScanResult(result?.map(m=>`${m.module}: ${m.faults} sample faults`).join(', ')??'');setScanned(true);}catch(e){setError(String(e));}}
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
      <div className="sidebar-bottom"><span className="status-dot"/> {demo?'SIMULATION ACTIVE':'HARDWARE DISCONNECTED'}<small>Version 0.3.0 • ENGINE</small></div>
    </aside>
    <main className="main">{error&&<section className="info" role="alert">{error}</section>}<header><div><div className="eyebrow">NEXUS / WORKSPACE</div><h1>{page}</h1><p>Automotive diagnostic workstation</p></div><span className={demo?'pill demo':'pill'}>{demo?'● SIMULATION ONLY':'○ NOT CONNECTED'}</span></header>
    {page==='Dashboard'&&<><section className="hero"><div><div className="eyebrow">VEHICLE CONNECTION</div><h2>{demo?'2009 Mitsubishi Lancer • Virtual ECU':'No vehicle connected'}</h2><p>{demo?'Synthetic demonstration data. No physical ECU or adapter is connected.':'Launch the simulator to explore diagnostics without hardware.'}</p><button className="primary" onClick={()=>void toggleDemo()} disabled={busy}>{demo?'Exit simulation':'Launch simulator'} →</button></div><CarFront className="hero-car" size={170} strokeWidth={0.7}/></section><div className="section-title"><h3>Vehicle telemetry</h3><span>{demo?'SIMULATED DATA':'AWAITING CONNECTION'}</span></div>{metricGrid}<section className="info"><PlugZap size={22}/><div><strong>Hardware integration is disabled</strong><p>All displayed values and faults are fictional test data. Never use them for actual vehicle diagnosis.</p></div></section></>}
    {page==='Vehicle Scan'&&<section className="panel"><h2>Virtual vehicle scan</h2><p>2009 Mitsubishi Lancer • 4B11 • CVT (example profile)</p><button className="primary" disabled={!demo} onClick={()=>void runScan()}>Run simulated scan</button>{!demo&&<p>Launch the simulator from Dashboard first.</p>}{demo&&scanned&&<div className="scan-result"><strong>Simulated scan complete</strong><p>{scanResult}</p><p>ABS, SRS and transmission: not simulated</p></div>}</section>}
    {page==='Trouble Codes'&&<section className="panel"><h2>Demonstration fault codes</h2><p>These codes are sample scenarios, not faults detected on your vehicle.</p>{demo?<><div className="fault-list">{faults.length?faults.map(f=><div className="fault" key={f.code}><strong>{f.code}</strong><span>{f.description}</span><small>{f.status} • SIMULATED</small></div>):<p>No demonstration faults stored.</p>}</div><button className="secondary" onClick={()=>void clearFaults()}>Clear simulated codes</button><button className="secondary" onClick={()=>void restoreFaults()}>Restore sample codes</button></>:<p>Start simulation to view sample faults.</p>}</section>}
    {page==='Live Data'&&<section className="panel"><h2>Live data simulator</h2><p>Randomly generated readings update every second while running. They do not represent real driving behaviour.</p>{metricGrid}<div className="button-row"><button className="primary" disabled={!demo} onClick={()=>setRunning(!running)}>{running?'Pause simulation':'Start changing readings'}</button><button className="secondary" disabled={!demo} onClick={()=>{setRunning(false);setReadings(initial);}}>Reset displayed readings</button></div></section>}
    {page==='Reports'&&<section className="panel"><h2>Simulation reports</h2><p>Reports stay in memory until you close the application.</p><button className="primary" disabled={!demo} onClick={()=>setReports(r=>[...r,`Demo report ${r.length+1}: ${new Date().toLocaleString()} • ${faults.length} sample fault(s) • ${readings.rpm} RPM`])}>Capture simulated report</button><div className="fault-list">{reports.map((r,i)=><div className="fault" key={i}>{r}</div>)}</div></section>}
    {page==='Settings'&&<section className="panel"><h2>Adapter manager</h2><p>Hardware adapters are not enabled in this build.</p><p>Current mode: {demo?'Virtual ECU simulation':'Disconnected'}</p><p>Adapter options:</p>{adapterManager.listAdapters().map(a=><div className="fault" key={a.id}><strong>{a.name}</strong><span>{a.available?(demo?"Connected to simulator":"Available — launch from Dashboard"):"Unavailable — driver not implemented"}</span></div>)}<p>Physical J2534 detection and read-only OBD-II are planned, not operational.</p></section>}
    </main>
  </div>;
}
