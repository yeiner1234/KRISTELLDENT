import Navbar from '../../components/home/Navbar';
import HeroSection from '../../components/home/HeroSection';
import AboutSection from '../../components/home/AboutSection';
import MissionVisionSection from '../../components/home/MissionVisionSection';
import SpecialtiesSection from '../../components/home/SpecialtiesSection';
import ProfessionalsSection from '../../components/home/ProfessionalsSection';
import ContactSection from '../../components/home/ContactSection';
import BookingCtaBand from '../../components/home/BookingCtaBand';
import Footer from '../../components/home/Footer';

function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <AboutSection />
      <MissionVisionSection />
      <SpecialtiesSection />
      <ProfessionalsSection />
      <ContactSection />
      <BookingCtaBand />
      <Footer />
    </>
  );
}

export default HomePage;
