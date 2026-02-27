export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function calculateQiblaBearing(lat: number, lng: number): number {
  const kaabaLat = toRadians(21.4225);
  const kaabaLng = toRadians(39.8262);
  const userLat = toRadians(lat);
  const userLng = toRadians(lng);

  const y = Math.sin(kaabaLng - userLng);
  const x =
    Math.cos(userLat) * Math.tan(kaabaLat) -
    Math.sin(userLat) * Math.cos(kaabaLng - userLng);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}
