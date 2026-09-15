'use client';

import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';

/**
 * Compras nativas (Apple/Google) vía RevenueCat. Solo funciona dentro del
 * shell nativo de Capacitor — en la web (navegador) no hay tienda con la que
 * hablar, así que todo acá chequea `Capacitor.isNativePlatform()` primero.
 */

let configured = false;

/** Llamar una vez que se conoce el usuario logueado (ver RevenueCatInit). */
export async function configurePurchases(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || configured) return;
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) return;

  await Purchases.configure({ apiKey, appUserID: userId });
  if (process.env.NODE_ENV === 'development') {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }
  configured = true;
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
