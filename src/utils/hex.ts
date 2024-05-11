export const buffToHex = (buff: Uint8Array) =>
  Array.from(buff, (char) => char.toString(16).padStart(2, "0")).join("");
export const stringToHex = (str: string) =>
  buffToHex(new TextEncoder().encode(str));
export const numberToHex = (value: number) => stringToHex(value.toString(36));
