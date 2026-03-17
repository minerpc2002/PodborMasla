/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Result from './pages/Result';
import Favorites from './pages/Favorites';
import History from './pages/History';
import { useAppStore } from './store/useAppStore';

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter>
      <div className="bg-blobs">
        <div className="blob w-[600px] h-[600px] bg-blue-500/40 top-[-20%] left-[-10%]" />
        <div className="blob w-[700px] h-[700px] bg-fuchsia-500/30 bottom-[-20%] right-[-10%] animation-delay-2000" />
        <div className="blob w-[500px] h-[500px] bg-cyan-400/30 top-[30%] right-[20%] animation-delay-4000" />
      </div>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="result/:id" element={<Result />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="history" element={<History />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
