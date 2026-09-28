// Pure, offline SAE J1979 Mode 01 response decoders. No vehicle I/O.
export function decodeMode01(pid:number, bytes:number[]):number {
  if(bytes.some(b=>!Number.isInteger(b)||b<0||b>255))throw Error('Invalid response bytes');
  const [a,b]=bytes;
  switch(pid){
    case 0x0c: if(bytes.length<2)break;return ((a*256+b)/4);
    case 0x0d: if(bytes.length<1)break;return a;
    case 0x05: if(bytes.length<1)break;return a-40;
    case 0x42: if(bytes.length<2)break;return (a*256+b)/1000;
  }
  throw Error('Unsupported PID or incomplete response');
}
export function decodeMode01Frame(frame:number[]):{pid:number;value:number}{
  if(frame.length<3||frame[0]!==0x41)throw Error('Expected Mode 01 positive response (0x41)');
  return {pid:frame[1],value:decodeMode01(frame[1],frame.slice(2))};
}
