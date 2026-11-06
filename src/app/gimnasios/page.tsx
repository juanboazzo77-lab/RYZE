import { permanentRedirect } from 'next/navigation';

/** El alta de gimnasios vive en el panel (con los términos para gimnasios): esta dirección vieja lleva allá. */
export default function GymsLandingPage() {
  permanentRedirect(process.env.NEXT_PUBLIC_PANEL_URL ? `${process.env.NEXT_PUBLIC_PANEL_URL.replace(/\/$/, '')}/solicitar` : 'https://panel.forzaai.app/solicitar');
}
