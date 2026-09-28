import type { DiagnosticAdapter, Reading, Fault, AdapterInfo } from './types';
const sampleFaults:Fault[] = [
  {code:'P0300',description:'Random/multiple cylinder misfire detected',status:'Stored'},
  {code:'P0133',description:'Oxygen sensor circuit slow response (Bank 1 Sensor 1)',status:'Pending'}
];
export class VirtualAdapter implements DiagnosticAdapter {
  readonly info:AdapterInfo={id:'virtual-lancer',name:'Virtual Lancer ECU',kind:'virtual',available:true};
  private connected=false;
  private reading:Reading={rpm:820,speed:0,coolant:89,voltage:14.1};
  private faults:Fault[]=sampleFaults.map(f=>({...f}));
  async connect(){this.connected=true;this.reading={rpm:820,speed:0,coolant:89,voltage:14.1};this.faults=sampleFaults.map(f=>({...f}));}
  async disconnect(){this.connected=false;}
  private assertConnected(){if(!this.connected)throw new Error('Virtual adapter is disconnected');}
  async readTelemetry():Promise<Reading>{
    this.assertConnected();const p=this.reading;
    this.reading={rpm:Math.round(Math.max(750,Math.min(4400,p.rpm+(Math.random()-.46)*450))),speed:Math.round(Math.max(0,Math.min(100,p.speed+(Math.random()-.42)*9))),coolant:+Math.max(85,Math.min(99,p.coolant+(Math.random()-.48)*.5)).toFixed(1),voltage:+(13.8+Math.random()*.6).toFixed(1)};
    return {...this.reading};
  }
  async readFaults(){this.assertConnected();return this.faults.map(f=>({...f}));}
  async clearDemoFaults(){this.assertConnected();this.faults=[];}
  async restoreDemoFaults(){this.assertConnected();this.faults=sampleFaults.map(f=>({...f}));}
  async scanModules(){this.assertConnected();return [
      {id:'engine',module:'Engine ECU',status:'Simulated',faults:this.faults.length},
      {id:'transmission',module:'Transmission Control',status:'Simulated',faults:0},
      {id:'abs',module:'ABS Module',status:'Simulated',faults:0},
      {id:'srs',module:'SRS Airbag Module',status:'Simulated',faults:0}
    ];}
}
