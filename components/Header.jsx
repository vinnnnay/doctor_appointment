import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Header = () => {
  return (
    <header  className='fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-10 supports-[backdrop-filter]:bg-background/60'>
        <nav>
            <Link>
            <Image src="/logo-single.png" alt="Logo" width={20} height={60}  className="h-10 w-auto object-contain"/>

           
          
            </Link>
        </nav>

      
    </header>
  );
}

export default Header;
