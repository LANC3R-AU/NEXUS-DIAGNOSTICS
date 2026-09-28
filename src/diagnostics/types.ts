export type Reading = { rpm:number; speed:number; coolant:number; voltage:number };
export type Fault = { code:string; description:string; status:'Stored'|'Pending' };
export type AdapterInfo = { id:string; name:string; kind:'virtual'|'physical'; available:boolean };
export interface DiagnosticAdapter {
  readonly info:AdapterInfo;
  connect():Promise<void>;
  disconnect():Promise<void>;
  readTelemetry():Promise<Reading>;
  readFaults():Promise<Fault[]>;
  clearDemoFaults():Promise<void>;
  scanModules():Promise<{module:string;status:string;faults:number}[]>;
}
