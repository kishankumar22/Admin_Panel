import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import Toast styles
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/css/froala_style.min.css';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';

import ECommerce from './pages/Dashboard/ECommerce';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tables from './pages/Tables';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import DefaultLayout from './layout/DefaultLayout';
import ProtectedRoute from '../src/components/ProtectedRoute';
import Addnotifications from './services/Addnotifications';
import AddBanner from './services/AddBanner';
import AddPicInGallery from './services/AddGallery';
import AddImportantLinks from './services/AddImportentLinks';
import AddFaculity from './services/AddFaculity';
import LatestPost from './services/LatestPost';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <>
      {/* Global ToastContainer */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/auth/signin"
          element={
            <>
              <PageTitle title="Sign In" />
              <SignIn />
            </>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <>
              <PageTitle title="Sign Up" />
              <SignUp />
            </>
          }
        />

        {/* Protected Routes within DefaultLayout */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <Routes>
                  <Route
                    index
                    element={
                      <>
                        <PageTitle title="eCommerce" />
                        <ECommerce />
                      </>
                    }
                  />
                  <Route
                    path="/addnotifications"
                    element={
                      <>
                        <PageTitle title="Add Notifications" />
                        <Addnotifications />
                      </>
                    }
                  />
                  <Route
                    path="/addbanner"
                    element={
                      <>
                        <PageTitle title="Add Banner" />
                        <AddBanner />
                      </>
                    }
                  />
                  <Route
                    path="/addpicingallery"
                    element={
                      <>
                        <PageTitle title="Add  Pic in gallery" />
                        <AddPicInGallery />
                      </>
                    }
                  />
                  <Route
                    path="/addimportentlinks"
                    element={
                      <>
                        <PageTitle title="Add Importent links" />
                        <AddImportantLinks />
                      </>
                    }
                  />
                  <Route
                    path="/addfaculity"
                    element={
                      <>
                        <PageTitle title="Add Faculity" />
                        <AddFaculity/>
                      </>
                    }
                  />
                  <Route
                    path="/latestpost"
                    element={
                      <>
                        <PageTitle title="Add latestpost" />
                        <LatestPost/>
                      </>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <>
                        <PageTitle title="Profile" />
                        <Profile />
                      </>
                    }
                  />
                  <Route
                    path="/forms/form-elements"
                    element={
                      <>
                        <PageTitle title="Form Elements" />
                        <FormElements />
                      </>
                    }
                  />
                  <Route
                    path="/forms/form-layout"
                    element={
                      <>
                        <PageTitle title="Form Layout" />
                        <FormLayout />
                      </>
                    }
                  />
                  <Route
                    path="/tables"
                    element={
                      <>
                        <PageTitle title="Tables" />
                        <Tables />
                      </>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <>
                        <PageTitle title="Settings" />
                        <Settings />
                      </>
                    }
                  />
               
                  <Route
                    path="/ui/alerts"
                    element={
                      <>
                        <PageTitle title="Alerts" />
                        <Alerts />
                      </>
                    }
                  />
                  <Route
                    path="/ui/buttons"
                    element={
                      <>
                        <PageTitle title="Buttons" />
                        <Buttons />
                      </>
                    }
                  />
                </Routes>
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
