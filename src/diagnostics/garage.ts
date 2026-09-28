export type Vehicle = {id:string; name:string; year:string; make:string; model:string; notes:string};
export type SavedScan = {id:string;vehicleId:string;timestamp:string;modules:{module:string;status:string;faults:number;id:string}[];faults:{code:string;description:string;status:'Stored'|'Pending'}[];mode:'simulation'};
const garageKey='nexus-v05-garage',scanKey='nexus-v05-scan-history';
function read<T>(key:string):T[]{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data:[]}catch{return []}}
export const loadVehicles=()=>read<Vehicle>(garageKey);
export const saveVehicles=(vehicles:Vehicle[])=>localStorage.setItem(garageKey,JSON.stringify(vehicles));
export const loadScans=()=>read<SavedScan>(scanKey);
export const saveScans=(scans:SavedScan[])=>localStorage.setItem(scanKey,JSON.stringify(scans));
