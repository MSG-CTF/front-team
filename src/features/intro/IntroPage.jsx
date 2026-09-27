import EventHero from "./components/EventHero.jsx";
import EventOverview from "./components/EventOverview.jsx";
import EventRegistration from "./components/EventRegistration.jsx";
import EventFormats from "./components/EventFormats.jsx";
import EventPrizes from "./components/EventPrizes.jsx";
import MileageShop from "./components/MileageShop.jsx";
import BoothLineup from "./components/BoothLineup.jsx";
import OnsiteGuide from "./components/OnsiteGuide.jsx";
import EventHistory from "./components/EventHistory.jsx";
import OrganizerLogos from "./components/OrganizerLogos.jsx";
import SponsorLogos from "./components/SponsorLogos.jsx";

export default function IntroPage() {
  return (
    <main>
      <EventHero />
      <EventOverview />
      <EventRegistration />
      <EventFormats />
      <EventPrizes />
      <MileageShop />
      <BoothLineup />
      <OnsiteGuide />
      <EventHistory />
      <OrganizerLogos />
      <SponsorLogos />
    </main>
  );
}
