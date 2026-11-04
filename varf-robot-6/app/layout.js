import './styles.css';
import PwaRegister from './pwa-register';

export const metadata = {
  title: 'Scanner Number One',
  description: 'Scanner crypto multi-bursă cu detectare timpurie, momentum și avertismente de vânzare',
  applicationName: 'Scanner Number One',
  appleWebApp: { capable: true, title: 'Scanner Number One', statusBarStyle: 'black-translucent' }
};

export const viewport = { themeColor: '#07111f', width: 'device-width', initialScale: 1 };

export default function RootLayout({children}){
  return <html lang="ro"><body><PwaRegister />{children}</body></html>;
}
