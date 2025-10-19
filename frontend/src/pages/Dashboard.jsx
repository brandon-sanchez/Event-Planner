import { signOut } from 'firebase/auth';
  import { auth } from '../config/firebase';
  import { useNavigate } from 'react-router-dom';

  function Dashboard() {
    const navigate = useNavigate();
    const userEmail = auth.currentUser?.email;

    const handleLogout = async () => {
      await signOut(auth);
      navigate('/');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-purple-600 mb-4">Dashboard</h1>
          {userEmail && (
            <p className="text-gray-700 mb-6">
              Logged in as: <span className="font-semibold text-purple-700">{userEmail}</span>
            </p>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-6 rounded-lg hover:bg-red-600 font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  export default Dashboard;