import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { initDb, db, Setting } from '@/lib/db';

export interface SettingsState {
  shopName: string;
  currency: string;
  address: string;
  phone: string;
}

const defaultSettings: SettingsState = {
  shopName: 'My Offline Shop',
  currency: 'Rs',
  address: '',
  phone: '',
};

const mapSettings = (rows: Setting[]): SettingsState => {
  const map: Record<string, string> = {};
  rows.forEach((row) => {
    map[row.key] = row.value;
  });

  return {
    shopName: map['shopName'] ?? defaultSettings.shopName,
    currency: map['currency'] ?? defaultSettings.currency,
    address: map['address'] ?? defaultSettings.address,
    phone: map['phone'] ?? defaultSettings.phone,
  };
};

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    let subscription: { unsubscribe(): void } | null = null;

    const loadSettings = async () => {
      await initDb();
      subscription = liveQuery(() => db.settings.toArray()).subscribe({
        next: (rows) => {
          setSettings(mapSettings(rows));
        },
      });
    };

    loadSettings();

    return () => subscription?.unsubscribe();
  }, []);

  return settings;
};
