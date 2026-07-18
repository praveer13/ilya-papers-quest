import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Map from '@/pages/Map'
import Paper from '@/pages/Paper'
import Boss from '@/pages/Boss'
import Achievements from '@/pages/Achievements'
import About from '@/pages/About'

// ROUTING CONTRACT: Layout uses the CHILDREN pattern (renders {children}),
// so routes are provided as children here. Do not nest a layout-route.
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/paper/:slug" element={<Paper />} />
        <Route path="/boss/:trackId" element={<Boss />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Map />} />
      </Routes>
    </Layout>
  )
}
