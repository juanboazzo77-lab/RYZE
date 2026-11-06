import { redirect } from 'next/navigation';

/** "Mi gimnasio" ahora es el panel del gimnasio (/gym): esta dirección vieja lo lleva ahí. */
export default function MyGymRedirect() {
  redirect('/gym');
}
