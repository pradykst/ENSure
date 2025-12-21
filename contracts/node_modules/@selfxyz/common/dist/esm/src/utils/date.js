// src/utils/date.ts
function getAdjustedTimestampBytes(y = 0, m = 0, d = 0) {
  const currentDate = /* @__PURE__ */ new Date();
  if (y !== 0) currentDate.setFullYear(currentDate.getFullYear() + y);
  if (m !== 0) currentDate.setMonth(currentDate.getMonth() + m);
  if (d !== 0) currentDate.setDate(currentDate.getDate() + d);
  const timestamp = Math.floor(currentDate.getTime() / 1e3);
  const bytes = [
    timestamp >> 24 & 255,
    timestamp >> 16 & 255,
    timestamp >> 8 & 255,
    timestamp & 255
  ];
  return bytes;
}
function getCurrentDateYYMMDD(dayDiff = 0) {
  const date = /* @__PURE__ */ new Date();
  date.setDate(date.getDate() + dayDiff);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const YY = `0${year % 100}`.slice(-2);
  const MM = `0${month}`.slice(-2);
  const DD = `0${day}`.slice(-2);
  const yymmdd = `${YY}${MM}${DD}`;
  return Array.from(yymmdd).map((char) => parseInt(char));
}
function getTimestampBytesFromYearFraction(yearFraction) {
  const year = Math.floor(yearFraction);
  const fraction = yearFraction - year;
  const monthsFromFraction = Math.floor(fraction * 12);
  const date = new Date(year, monthsFromFraction, 1);
  const timestamp = Math.floor(date.getTime() / 1e3);
  const bytes = [
    timestamp >> 24 & 255,
    timestamp >> 16 & 255,
    timestamp >> 8 & 255,
    timestamp & 255
  ];
  return bytes;
}
function unixTimestampToYYMMDD(timestamp) {
  console.log("timestamp: " + timestamp);
  const date = new Date(timestamp * 1e3);
  console.log("date: " + date);
  const year = date.getUTCFullYear();
  console.log("year: " + year);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const YY = `0${year % 100}`.slice(-2);
  const MM = `0${month}`.slice(-2);
  const DD = `0${day}`.slice(-2);
  return `${YY}${MM}${DD}`;
}
function yearFractionToYYMMDD(yearFraction) {
  const year = yearFraction;
  const fraction = yearFraction - Math.floor(yearFraction);
  const monthsFromFraction = Math.floor(fraction * 12);
  const day = 1;
  const YY = `0${Math.floor(year) % 100}`.slice(-2);
  const MM = `0${monthsFromFraction + 1}`.slice(-2);
  const DD = `0${day}`.slice(-2);
  return `${YY}${MM}${DD}`;
}
function yymmddToByteArray(yymmdd) {
  const byteArray = Array.from(yymmdd).map((char) => char.charCodeAt(0));
  return byteArray;
}
export {
  getAdjustedTimestampBytes,
  getCurrentDateYYMMDD,
  getTimestampBytesFromYearFraction,
  unixTimestampToYYMMDD,
  yearFractionToYYMMDD,
  yymmddToByteArray
};
//# sourceMappingURL=date.js.map