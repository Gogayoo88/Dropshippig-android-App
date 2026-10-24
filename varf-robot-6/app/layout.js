import './styles.css';
import PwaRegister from './pwa-register';

export const metadata = {
  title: 'Vârf Robot 5',
  description: 'Scanner crypto și acțiuni cu confirmări multi-sursă',
  applicationName: 'Vârf Robot',
  appleWebApp: { capable: true, title: 'Vârf Robot', statusBarStyle: 'black-translucent' }
};

export const viewport = { themeColor: '#07111f', width: 'device-width', initialScale: 1 };

export default function RootLayout({children}){
  return <html lang="ro"><body><PwaRegister />{children}</body></html>;
}
