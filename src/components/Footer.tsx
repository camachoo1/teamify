import ReactSvg from '../assets/react_dark.svg';
import TypeScriptSvg from '../assets/typescript.svg';
import ViteSvg from '../assets/vitejs.svg';
import TailwindSvg from '../assets/tailwindcss.svg';

const stack = [
  { src: ReactSvg, name: 'React' },
  { src: TypeScriptSvg, name: 'TypeScript' },
  { src: ViteSvg, name: 'Vite' },
  { src: TailwindSvg, name: 'Tailwind CSS' },
];

export default function Footer() {
  return (
    <footer className='border-t border-line'>
      <div className='mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted sm:px-8'>
        <p>Teamify, developed by Fade</p>
        <div className='flex items-center gap-3'>
          <span>Built with</span>
          {stack.map(({ src, name }) => (
            <img
              key={name}
              src={src}
              alt={name}
              title={name}
              className='h-5 w-5 opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0'
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
