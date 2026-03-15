export interface DecodedVehicle {
  make: string;
  model: string;
  year: string;
  engine: string;
  transmission: string;
}

export async function decodeVin(vin: string): Promise<DecodedVehicle | null> {
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    
    if (data.Results && data.Results[0] && data.Results[0].ErrorCode === '0') {
      const v = data.Results[0];
      return {
        make: v.Make,
        model: v.Model,
        year: v.ModelYear,
        engine: `${v.DisplacementL || ''}L ${v.EngineConfiguration || ''} ${v.FuelTypePrimary || ''}`,
        transmission: v.TransmissionStyle || v.Transmission || ''
      };
    }
    return null;
  } catch (error) {
    console.error("NHTSA API failed", error);
    return null;
  }
}
