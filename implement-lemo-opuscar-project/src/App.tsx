import { LangProvider } from "./lang";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Feature } from "./components/Feature";
import { About } from "./components/About";
import { HowTo } from "./components/HowTo";
import { Gallery } from "./components/Gallery";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <LangProvider>
      <div className="film-grain min-h-screen">
        <Header />
        <main>
          <Hero />
          <Feature />
          <About />
          <HowTo />
          <Gallery />
        </main>
        <Footer />
      </div>
    </LangProvider>
  );
}
