import Header from '../components/Header';
import Calendar from '../components/Calendar';

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <Calendar />
      </main>
    </div>
  );
}

export default Dashboard;