/**
 * Bluetooth Scale Integration
 * Supports generic BLE scales and Escali-style Bluetooth scales
 *
 * Based on Web Bluetooth API
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
 */

// Type declarations for Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

interface Bluetooth {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  getAvailability(): Promise<boolean>;
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
}

type BluetoothServiceUUID = number | string;

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  device: BluetoothDevice;
  uuid: string;
  getCharacteristic(characteristic: BluetoothServiceUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  service: BluetoothRemoteGATTService;
  uuid: string;
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
}

// Common BLE service UUIDs for scales
const SCALE_SERVICES = {
  // Generic Weight Scale Service
  WEIGHT_SCALE: '0000181d-0000-1000-8000-00805f9b34fb',
  // Custom services (varies by manufacturer)
  ESCALI: '0000ffe0-0000-1000-8000-00805f9b34fb',
  // Generic service
  GENERIC: '0000fff0-0000-1000-8000-00805f9b34fb',
};

const SCALE_CHARACTERISTICS = {
  // Standard weight measurement characteristic
  WEIGHT_MEASUREMENT: '00002a9d-0000-1000-8000-00805f9b34fb',
  // Escali custom characteristic
  ESCALI_DATA: '0000ffe1-0000-1000-8000-00805f9b34fb',
  // Generic data characteristic
  GENERIC_DATA: '0000fff1-0000-1000-8000-00805f9b34fb',
};

export interface ScaleReading {
  weightG: number;
  unit: 'g' | 'oz' | 'lb';
  stable: boolean;
  timestamp: number;
}

export interface ScaleDevice {
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  characteristic?: BluetoothRemoteGATTCharacteristic;
  connected: boolean;
  name: string;
  id: string;
}

export class BluetoothScaleManager {
  private device: ScaleDevice | null = null;
  private onWeightCallback: ((reading: ScaleReading) => void) | null = null;
  private onConnectionCallback: ((connected: boolean) => void) | null = null;

  /**
   * Check if Web Bluetooth API is supported
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Request pairing with a Bluetooth scale
   */
  async requestDevice(): Promise<ScaleDevice> {
    if (!BluetoothScaleManager.isSupported()) {
      throw new Error('Bluetooth is not supported in this browser');
    }

    if (!navigator.bluetooth) {
      throw new Error('Bluetooth API not available');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [SCALE_SERVICES.WEIGHT_SCALE] },
          { services: [SCALE_SERVICES.ESCALI] },
          { services: [SCALE_SERVICES.GENERIC] },
          { namePrefix: 'Scale' },
          { namePrefix: 'Escali' },
        ],
        optionalServices: Object.values(SCALE_SERVICES).concat(Object.values(SCALE_CHARACTERISTICS)),
      });

      this.device = {
        device,
        connected: false,
        name: device.name || 'Unknown Scale',
        id: device.id,
      };

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });

      return this.device;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new Error('No Bluetooth scale found. Make sure it\'s powered on and in pairing mode.');
      }
      throw new Error(`Failed to pair with scale: ${error.message}`);
    }
  }

  /**
   * Connect to a paired scale
   */
  async connect(): Promise<void> {
    if (!this.device) {
      throw new Error('No device paired. Call requestDevice() first.');
    }

    try {
      const server = await this.device.device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      this.device.server = server;
      this.device.connected = true;
      this.onConnectionCallback?.(true);

      // Try to find the weight measurement characteristic
      await this.discoverCharacteristics();
    } catch (error: any) {
      this.device.connected = false;
      this.onConnectionCallback?.(false);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Discover and subscribe to weight measurement characteristic
   */
  private async discoverCharacteristics(): Promise<void> {
    if (!this.device?.server) return;

    // Try each service until we find one that works
    const servicesToTry = Object.values(SCALE_SERVICES);
    const characteristicsToTry = Object.values(SCALE_CHARACTERISTICS);

    for (const serviceUuid of servicesToTry) {
      try {
        const service = await this.device.server.getPrimaryService(serviceUuid);

        for (const charUuid of characteristicsToTry) {
          try {
            const characteristic = await service.getCharacteristic(charUuid);

            // Subscribe to notifications
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
              this.handleWeightData(event);
            });

            this.device.characteristic = characteristic;
            console.log(`✅ Connected to scale characteristic: ${charUuid}`);
            return;
          } catch (charError) {
            // Try next characteristic
            continue;
          }
        }
      } catch (serviceError) {
        // Try next service
        continue;
      }
    }

    throw new Error('Could not find weight measurement characteristic. This scale may not be supported.');
  }

  /**
   * Parse weight data from characteristic
   */
  private handleWeightData(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (!value) return;

    try {
      const reading = this.parseWeightValue(value);
      this.onWeightCallback?.(reading);
    } catch (error) {
      console.error('Error parsing weight data:', error);
    }
  }

  /**
   * Parse weight value from DataView
   * Supports multiple formats (standard BLE, Escali, generic)
   */
  private parseWeightValue(value: DataView): ScaleReading {
    // Standard BLE Weight Scale format (GATT Specification)
    if (value.byteLength >= 3) {
      const flags = value.getUint8(0);
      const unitImperial = (flags & 0x01) === 0x01;
      const timestampPresent = (flags & 0x02) === 0x02;
      const userIdPresent = (flags & 0x04) === 0x04;
      const bmiPresent = (flags & 0x08) === 0x08;

      let offset = 1;
      const weight = value.getUint16(offset, true); // little-endian
      offset += 2;

      // Convert to grams
      let weightG: number;
      if (unitImperial) {
        // Weight is in pounds * 100
        weightG = (weight / 100) * 453.592; // Convert lb to g
      } else {
        // Weight is in kg * 100
        weightG = (weight / 100) * 1000; // Convert kg to g
      }

      return {
        weightG: Math.round(weightG * 10) / 10,
        unit: 'g',
        stable: true,
        timestamp: Date.now(),
      };
    }

    // Fallback: try to parse as simple integer (grams)
    if (value.byteLength === 2) {
      const weight = value.getUint16(0, true);
      return {
        weightG: weight,
        unit: 'g',
        stable: true,
        timestamp: Date.now(),
      };
    }

    throw new Error('Unknown weight data format');
  }

  /**
   * Disconnect from scale
   */
  async disconnect(): Promise<void> {
    if (this.device?.server?.connected) {
      this.device.server.disconnect();
    }
    this.handleDisconnection();
  }

  /**
   * Handle disconnection event
   */
  private handleDisconnection(): void {
    if (this.device) {
      this.device.connected = false;
      this.device.server = undefined;
      this.device.characteristic = undefined;
    }
    this.onConnectionCallback?.(false);
  }

  /**
   * Register callback for weight readings
   */
  onWeight(callback: (reading: ScaleReading) => void): void {
    this.onWeightCallback = callback;
  }

  /**
   * Register callback for connection status changes
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionCallback = callback;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.device?.connected ?? false;
  }

  /**
   * Get connected device info
   */
  getDevice(): ScaleDevice | null {
    return this.device;
  }
}

// Singleton instance
let scaleManager: BluetoothScaleManager | null = null;

export function getScaleManager(): BluetoothScaleManager {
  if (!scaleManager) {
    scaleManager = new BluetoothScaleManager();
  }
  return scaleManager;
}
