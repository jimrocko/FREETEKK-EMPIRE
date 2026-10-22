export interface VehicleRental {
  id: string;
  optionId: string;
  defId: string;
  until: number;
}

export interface TransportState {
  rentals: VehicleRental[];
  nextId: number;
}

export function createTransportState(): TransportState {
  return { rentals: [], nextId: 1 };
}
