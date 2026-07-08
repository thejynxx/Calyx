import { auth } from "@/auth";
import { Search } from "@/components/navbar/Search";
import { UserInfo } from "@/components/navbar/UserInfo";
import { Menu } from "@/components/navbar/Menu";
import { MinimizeMenuButton } from "@/components/navbar/MinimizeMenuButton";
import { SetSentryUser } from "./SetSentryUser";
import { LinkWithIcon } from "../LinkWithIcon";
import {
  RiDashboardLine,
  RiFileSearchLine,
  RiListSettingsLine,
  RiBookOpenLine,
  RiSettings3Line,
  RiSparkling2Line,
  RiAlertLine,
  RiShieldFlashLine,
} from "react-icons/ri";
import { LuWorkflow } from "react-icons/lu";
import { VscDebugDisconnect } from "react-icons/vsc";
import { AiOutlineAlert } from "react-icons/ai";
import "./Navbar.css";

export default async function NavbarInner() {
  const session = await auth();

  return (
    <>
      <Menu session={session}>
        <Search session={session} />
        <div className="pt-6 px-3 space-y-2 flex-1 overflow-auto scrollable-menu-shadow">
          <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Calyx AIOps Center
          </div>
          <LinkWithIcon href="/aiops/dashboard" icon={RiDashboardLine}>
            Dashboard
          </LinkWithIcon>
          <LinkWithIcon href="/aiops/analyzer" icon={RiFileSearchLine}>
            Log Analyzer
          </LinkWithIcon>
          <LinkWithIcon href="/aiops/rules" icon={RiListSettingsLine}>
            Rule Builder
          </LinkWithIcon>
          <LinkWithIcon href="/aiops/ai-correlation" icon={RiSparkling2Line}>
            AI Correlation
          </LinkWithIcon>
          <LinkWithIcon href="/aiops/guide" icon={RiBookOpenLine}>
            User Guide
          </LinkWithIcon>
          <LinkWithIcon href="/aiops/settings" icon={RiSettings3Line}>
            Settings
          </LinkWithIcon>
          <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">
            Calyx Platform
          </div>
          <LinkWithIcon href="/alerts/feed" icon={AiOutlineAlert}>
            Alerts Feed
          </LinkWithIcon>
          <LinkWithIcon href="/incidents" icon={RiShieldFlashLine}>
            Incidents
          </LinkWithIcon>
          <LinkWithIcon href="/providers" icon={VscDebugDisconnect}>
            Integrations
          </LinkWithIcon>
          <LinkWithIcon href="/workflows" icon={LuWorkflow}>
            Workflows
          </LinkWithIcon>
        </div>
        <UserInfo session={session} />
      </Menu>
      <MinimizeMenuButton />
      <SetSentryUser session={session} />
    </>
  );
}
