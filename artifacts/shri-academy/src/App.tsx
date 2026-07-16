import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Subscribe from '@/pages/subscribe';
import Marketplace from '@/pages/marketplace';
import Scholarship from '@/pages/scholarship';
import Research from '@/pages/research';
import Drawing from '@/pages/drawing';
import Games from '@/pages/games';
import Mythology from '@/pages/mythology';
import Forum from '@/pages/forum';
import DevTeam from '@/pages/dev-team';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import MentorLogin from '@/pages/mentor-login';
import MentorDashboard from '@/pages/mentor-dashboard';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <Home />}</Route>
      <Route path="/subscribe">{() => <Subscribe />}</Route>
      <Route path="/marketplace">{() => <Marketplace />}</Route>
      <Route path="/scholarship">{() => <Scholarship />}</Route>
      <Route path="/research">{() => <Research />}</Route>
      <Route path="/drawing">{() => <Drawing />}</Route>
      <Route path="/games">{() => <Games />}</Route>
      <Route path="/mythology">{() => <Mythology />}</Route>
      <Route path="/forum">{() => <Forum />}</Route>
      <Route path="/dev-team">{() => <DevTeam />}</Route>
      <Route path="/mentor/login">{() => <MentorLogin />}</Route>
      <Route path="/mentor">{() => <MentorDashboard />}</Route>
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
