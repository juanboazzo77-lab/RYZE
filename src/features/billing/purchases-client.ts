'use client';

import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';

/**
 * Compras nativas (Apple/Google) vía RevenueCat. Solo funciona dentro del
 * shell nativo de Capacitor — en la web (navegador) no hay tienda con la que
 * hablar, así que todo acá chequea `Capacitor.isNativePlatform()` primero.
 */

let configured = false;

/**
 * Clave pública del SDK según la plataforma. Cada tienda tiene la suya (iOS `appl_…`, Android
 * `goog_…`); `NEXT_PUBLIC_REVENUECAT_API_KEY` queda como respaldo.
 */
function sdkKey(): string | undefined {
  const platform = Capacitor.getPlatform();
  const perPlatform =
    platform === 'ios'
      ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
      : platform === 'android'
        ? process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
        : undefined;
  return perPlatform || process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || undefined;
}

/** Llamar una vez que se conoce el usuario logueado (ver RevenueCatInit). */
export async function configurePurchases(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || configured) return;
  const apiKey = sdkKey();
  if (!apiKey) return;
  // Una clave equivocada (la del "Test Store", `test_…`, o la de la otra tienda) hace que el SDK
  // muestre "Wrong API Key" y cierre la app: fue el motivo del rechazo 2.1(a) de Apple. Sólo se
  // configura con la clave que corresponde a la plataforma; si no, las compras quedan no
  // disponibles pero la app no se rompe.
  const expectedPrefix = Capacitor.getPlatform() === 'ios' ? 'appl_' : 'goog_';
  if (!apiKey.startsWith(expectedPrefix)) return;

  try {
    await Purchases.configure({ apiKey, appUserID: userId });
    if (process.env.NODE_ENV === 'development') {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    configured = true;
  } catch (e) {
    console.error('[purchases] no se pudo configurar RevenueCat', e);
  }
}

export async function getCurrentOfferingPackages(): Promise<PurchasesPackage[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const { current } = await Purchases.getOfferings();
  return current?.availablePackages ?? [];
}

/** Compra un paquete. Devuelve el set de entitlements activos tras la compra. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<string[]> {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return Object.keys(customerInfo.entitlements.active);
}

export async function restorePurchases(): Promise<string[]> {
  const { customerInfo } = await Purchases.restorePurchases();
  return Object.keys(customerInfo.entitlements.active);
}
