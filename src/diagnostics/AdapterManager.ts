import { VirtualAdapter } from './VirtualAdapter';
import type { AdapterInfo, DiagnosticAdapter } from './types';
export class AdapterManager {
  private virtual=new VirtualAdapter();
  private active:DiagnosticAdapter|null=null;
  listAdapters():AdapterInfo[]{return [this.virtual.info,{id:'j2534',name:'J2534 hardware (not implemented)',kind:'physical',available:false}];}
  async connect(id:string){if(id!=='virtual-lancer')throw new Error('Physical adapter support is not implemented');await this.disconnect();await this.virtual.connect();this.active=this.virtual;return this.virtual.info;}
  async disconnect(){if(this.active)await this.active.disconnect();this.active=null;}
  get adapter(){return this.active;}
  get virtualAdapter(){return this.virtual;}
}
export const adapterManager=new AdapterManager();
