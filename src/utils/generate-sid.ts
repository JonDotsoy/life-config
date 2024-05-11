const randRange = (min: number, max: number) =>
  min + Math.floor((max - min) * Math.random());

export const generateSID = () =>
  `${Number(new Date()).toString(36)}.${randRange(1e20, 1e21 - 1).toString(36)}`;

export const describeSID = (sid: string) => {
  const parts = sid.split(".");
  const datePart = parts.at(0);

  return {
    date: datePart ? new Date(parseInt(datePart, 36)) : null,
  };
};

generateSID.describe = describeSID;
