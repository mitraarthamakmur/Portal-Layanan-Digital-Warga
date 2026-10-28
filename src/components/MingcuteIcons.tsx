import React from 'react';
import type { IconProps as MingcuteBaseProps } from '@mingcute/react';

import AddReg from '@mingcute/react/core-regular/add';
import AddFil from '@mingcute/react/core-filled/add';
import AlertReg from '@mingcute/react/core-regular/alert';
import AlertFil from '@mingcute/react/core-filled/alert';
import ArrowRightReg from '@mingcute/react/core-regular/arrow-right';
import ArrowRightFil from '@mingcute/react/core-filled/arrow-right';
import Box3Reg from '@mingcute/react/core-regular/box-3';
import Box3Fil from '@mingcute/react/core-filled/box-3';
import BroomReg from '@mingcute/react/core-regular/broom';
import BroomFil from '@mingcute/react/core-filled/broom';
import CalendarTimeAddReg from '@mingcute/react/core-regular/calendar-time-add';
import CalendarTimeAddFil from '@mingcute/react/core-filled/calendar-time-add';
import Camera2Reg from '@mingcute/react/core-regular/camera-2';
import Camera2Fil from '@mingcute/react/core-filled/camera-2';
import ChartBar2Reg from '@mingcute/react/core-regular/chart-bar-2';
import ChartBar2Fil from '@mingcute/react/core-filled/chart-bar-2';
import CheckCircleReg from '@mingcute/react/core-regular/check-circle';
import CheckCircleFil from '@mingcute/react/core-filled/check-circle';
import ClipboardReg from '@mingcute/react/core-regular/clipboard';
import ClipboardFil from '@mingcute/react/core-filled/clipboard';
import CloseReg from '@mingcute/react/core-regular/close';
import CloseFil from '@mingcute/react/core-filled/close';
import CloudReg from '@mingcute/react/core-regular/cloud';
import CloudFil from '@mingcute/react/core-filled/cloud';
import Comment2Reg from '@mingcute/react/core-regular/comment-2';
import Comment2Fil from '@mingcute/react/core-filled/comment-2';
import Copy2Reg from '@mingcute/react/core-regular/copy-2';
import Copy2Fil from '@mingcute/react/core-filled/copy-2';
import Dashboard2Reg from '@mingcute/react/core-regular/dashboard-2';
import Dashboard2Fil from '@mingcute/react/core-filled/dashboard-2';
import Delete2Reg from '@mingcute/react/core-regular/delete-2';
import Delete2Fil from '@mingcute/react/core-filled/delete-2';
import Document2Reg from '@mingcute/react/core-regular/document-2';
import Document2Fil from '@mingcute/react/core-filled/document-2';
import Download2Reg from '@mingcute/react/core-regular/download-2';
import Download2Fil from '@mingcute/react/core-filled/download-2';
import Download3Reg from '@mingcute/react/core-regular/download-3';
import Download3Fil from '@mingcute/react/core-filled/download-3';
import Edit2Reg from '@mingcute/react/core-regular/edit-2';
import Edit2Fil from '@mingcute/react/core-filled/edit-2';
import ExitReg from '@mingcute/react/core-regular/exit';
import ExitFil from '@mingcute/react/core-filled/exit';
import Eye2Reg from '@mingcute/react/core-regular/eye-2';
import Eye2Fil from '@mingcute/react/core-filled/eye-2';
import EyeCloseReg from '@mingcute/react/core-regular/eye-close';
import EyeCloseFil from '@mingcute/react/core-filled/eye-close';
import FileCertificateReg from '@mingcute/react/core-regular/file-certificate';
import FileCertificateFil from '@mingcute/react/core-filled/file-certificate';
import Group2Reg from '@mingcute/react/core-regular/group-2';
import Group2Fil from '@mingcute/react/core-filled/group-2';
import HandHeartReg from '@mingcute/react/core-regular/hand-heart';
import HandHeartFil from '@mingcute/react/core-filled/hand-heart';
import Home4Reg from '@mingcute/react/core-regular/home-4';
import Home4Fil from '@mingcute/react/core-filled/home-4';
import IdcardReg from '@mingcute/react/core-regular/idcard';
import IdcardFil from '@mingcute/react/core-filled/idcard';
import InformationReg from '@mingcute/react/core-regular/information';
import InformationFil from '@mingcute/react/core-filled/information';
import Key2Reg from '@mingcute/react/core-regular/key-2';
import Key2Fil from '@mingcute/react/core-filled/key-2';
import LayoutLeftbarCloseReg from '@mingcute/react/core-regular/layout-leftbar-close';
import LayoutLeftbarCloseFil from '@mingcute/react/core-filled/layout-leftbar-close';
import LayoutLeftbarOpenReg from '@mingcute/react/core-regular/layout-leftbar-open';
import LayoutLeftbarOpenFil from '@mingcute/react/core-filled/layout-leftbar-open';
import LockReg from '@mingcute/react/core-regular/lock';
import LockFil from '@mingcute/react/core-filled/lock';
import MapPinReg from '@mingcute/react/core-regular/map-pin';
import MapPinFil from '@mingcute/react/core-filled/map-pin';
import MenuReg from '@mingcute/react/core-regular/menu';
import MenuFil from '@mingcute/react/core-filled/menu';
import MoonStarsReg from '@mingcute/react/core-regular/moon-stars';
import MoonStarsFil from '@mingcute/react/core-filled/moon-stars';
import Notebook2Reg from '@mingcute/react/core-regular/notebook-2';
import Notebook2Fil from '@mingcute/react/core-filled/notebook-2';
import NotificationReg from '@mingcute/react/core-regular/notification';
import NotificationFil from '@mingcute/react/core-filled/notification';
import PhoneReg from '@mingcute/react/core-regular/phone';
import PhoneFil from '@mingcute/react/core-filled/phone';
import PrintReg from '@mingcute/react/core-regular/print';
import PrintFil from '@mingcute/react/core-filled/print';
import Refresh2Reg from '@mingcute/react/core-regular/refresh-2';
import Refresh2Fil from '@mingcute/react/core-filled/refresh-2';
import RestoreReg from '@mingcute/react/core-regular/restore';
import RestoreFil from '@mingcute/react/core-filled/restore';
import SafeAlertReg from '@mingcute/react/core-regular/safe-alert';
import SafeAlertFil from '@mingcute/react/core-filled/safe-alert';
import SafeLockReg from '@mingcute/react/core-regular/safe-lock';
import SafeLockFil from '@mingcute/react/core-filled/safe-lock';
import SafetyCertificateReg from '@mingcute/react/core-regular/safety-certificate';
import SafetyCertificateFil from '@mingcute/react/core-filled/safety-certificate';
import Server2Reg from '@mingcute/react/core-regular/server-2';
import Server2Fil from '@mingcute/react/core-filled/server-2';
import Settings3Reg from '@mingcute/react/core-regular/settings-3';
import Settings3Fil from '@mingcute/react/core-filled/settings-3';
import SunReg from '@mingcute/react/core-regular/sun';
import SunFil from '@mingcute/react/core-filled/sun';
import Table2Reg from '@mingcute/react/core-regular/table-2';
import Table2Fil from '@mingcute/react/core-filled/table-2';
import TimeReg from '@mingcute/react/core-regular/time';
import TimeFil from '@mingcute/react/core-filled/time';
import Upload2Reg from '@mingcute/react/core-regular/upload-2';
import Upload2Fil from '@mingcute/react/core-filled/upload-2';
import Upload3Reg from '@mingcute/react/core-regular/upload-3';
import Upload3Fil from '@mingcute/react/core-filled/upload-3';
import User3Reg from '@mingcute/react/core-regular/user-3';
import User3Fil from '@mingcute/react/core-filled/user-3';
import UserAdd2Reg from '@mingcute/react/core-regular/user-add-2';
import UserAdd2Fil from '@mingcute/react/core-filled/user-add-2';
import UserSettingReg from '@mingcute/react/core-regular/user-setting';
import UserSettingFil from '@mingcute/react/core-filled/user-setting';
import Wallet4Reg from '@mingcute/react/core-regular/wallet-4';
import Wallet4Fil from '@mingcute/react/core-filled/wallet-4';
import WifiOffReg from '@mingcute/react/core-regular/wifi-off';
import WifiOffFil from '@mingcute/react/core-filled/wifi-off';

export interface AppIconProps extends MingcuteBaseProps {
  filled?: boolean;
}

export type AppIconComponent = React.ForwardRefExoticComponent<
  AppIconProps & React.RefAttributes<SVGSVGElement>
>;

export type LucideProps = AppIconProps;
export type LucideIcon = AppIconComponent;

function createDualMingcute(
  RegularComp: React.ForwardRefExoticComponent<MingcuteBaseProps & React.RefAttributes<SVGSVGElement>>,
  FilledComp: React.ForwardRefExoticComponent<MingcuteBaseProps & React.RefAttributes<SVGSVGElement>>,
  displayName: string
): AppIconComponent {
  const Wrapped = React.forwardRef<SVGSVGElement, AppIconProps>(
    ({ filled = false, ...rest }, ref) => {
      const Target = filled ? FilledComp : RegularComp;
      return <Target ref={ref} {...rest} />;
    }
  );
  Wrapped.displayName = displayName;
  return Wrapped;
}

// 16 Core Navigation & Custom Domain Icons (Line + Fill)
export const LayoutDashboard = createDualMingcute(Dashboard2Reg, Dashboard2Fil, 'LayoutDashboard');
export const UserCheck = createDualMingcute(IdcardReg, IdcardFil, 'UserCheck');
export const Users = createDualMingcute(Group2Reg, Group2Fil, 'Users');
export const UserPlus = createDualMingcute(UserAdd2Reg, UserAdd2Fil, 'UserPlus');
export const BarChart3 = createDualMingcute(ChartBar2Reg, ChartBar2Fil, 'BarChart3');
export const FileSignature = createDualMingcute(FileCertificateReg, FileCertificateFil, 'FileSignature');
export const Clock = createDualMingcute(TimeReg, TimeFil, 'Clock');
export const BookOpenCheck = createDualMingcute(Notebook2Reg, Notebook2Fil, 'BookOpenCheck');
export const MessageSquareWarning = createDualMingcute(Comment2Reg, Comment2Fil, 'MessageSquareWarning');
export const SanitationHandShieldIcon = createDualMingcute(BroomReg, BroomFil, 'SanitationHandShieldIcon');
export const HeartHandshake = createDualMingcute(HandHeartReg, HandHeartFil, 'HeartHandshake');
export const Wallet = createDualMingcute(Wallet4Reg, Wallet4Fil, 'Wallet');
export const Boxes = createDualMingcute(Box3Reg, Box3Fil, 'Boxes');
export const UserCog = createDualMingcute(UserSettingReg, UserSettingFil, 'UserCog');
export const ClipboardList = createDualMingcute(ClipboardReg, ClipboardFil, 'ClipboardList');
export const Settings = createDualMingcute(Settings3Reg, Settings3Fil, 'Settings');
export const AgendaCalendarCheckIcon = createDualMingcute(CalendarTimeAddReg, CalendarTimeAddFil, 'AgendaCalendarCheckIcon');

// Action, Status & Utility Icons (Line + Fill)
export const AlertCircle = createDualMingcute(InformationReg, InformationFil, 'AlertCircle');
export const AlertTriangle = createDualMingcute(AlertReg, AlertFil, 'AlertTriangle');
export const ArrowRight = createDualMingcute(ArrowRightReg, ArrowRightFil, 'ArrowRight');
export const Bell = createDualMingcute(NotificationReg, NotificationFil, 'Bell');
export const CalendarClock = createDualMingcute(CalendarTimeAddReg, CalendarTimeAddFil, 'CalendarClock');
export const Camera = createDualMingcute(Camera2Reg, Camera2Fil, 'Camera');
export const CheckCircle2 = createDualMingcute(CheckCircleReg, CheckCircleFil, 'CheckCircle2');
export const Cloud = createDualMingcute(CloudReg, CloudFil, 'Cloud');
export const CloudDownload = createDualMingcute(Download3Reg, Download3Fil, 'CloudDownload');
export const CloudOff = createDualMingcute(WifiOffReg, WifiOffFil, 'CloudOff');
export const CloudUpload = createDualMingcute(Upload3Reg, Upload3Fil, 'CloudUpload');
export const Copy = createDualMingcute(Copy2Reg, Copy2Fil, 'Copy');
export const Download = createDualMingcute(Download2Reg, Download2Fil, 'Download');
export const Eye = createDualMingcute(Eye2Reg, Eye2Fil, 'Eye');
export const EyeOff = createDualMingcute(EyeCloseReg, EyeCloseFil, 'EyeOff');
export const FileSpreadsheet = createDualMingcute(Table2Reg, Table2Fil, 'FileSpreadsheet');
export const FileText = createDualMingcute(Document2Reg, Document2Fil, 'FileText');
export const HardDrive = createDualMingcute(Server2Reg, Server2Fil, 'HardDrive');
export const Home = createDualMingcute(Home4Reg, Home4Fil, 'Home');
export const KeyRound = createDualMingcute(Key2Reg, Key2Fil, 'KeyRound');
export const Lock = createDualMingcute(LockReg, LockFil, 'Lock');
export const LockKeyhole = createDualMingcute(SafeLockReg, SafeLockFil, 'LockKeyhole');
export const LogOut = createDualMingcute(ExitReg, ExitFil, 'LogOut');
export const MapPin = createDualMingcute(MapPinReg, MapPinFil, 'MapPin');
export const Menu = createDualMingcute(MenuReg, MenuFil, 'Menu');
export const Moon = createDualMingcute(MoonStarsReg, MoonStarsFil, 'Moon');
export const PanelLeftClose = createDualMingcute(LayoutLeftbarCloseReg, LayoutLeftbarCloseFil, 'PanelLeftClose');
export const PanelLeftOpen = createDualMingcute(LayoutLeftbarOpenReg, LayoutLeftbarOpenFil, 'PanelLeftOpen');
export const Pencil = createDualMingcute(Edit2Reg, Edit2Fil, 'Pencil');
export const Phone = createDualMingcute(PhoneReg, PhoneFil, 'Phone');
export const Plus = createDualMingcute(AddReg, AddFil, 'Plus');
export const Printer = createDualMingcute(PrintReg, PrintFil, 'Printer');
export const RefreshCw = createDualMingcute(Refresh2Reg, Refresh2Fil, 'RefreshCw');
export const RotateCcw = createDualMingcute(RestoreReg, RestoreFil, 'RotateCcw');
export const ShieldAlert = createDualMingcute(SafeAlertReg, SafeAlertFil, 'ShieldAlert');
export const ShieldCheck = createDualMingcute(SafetyCertificateReg, SafetyCertificateFil, 'ShieldCheck');
export const Sun = createDualMingcute(SunReg, SunFil, 'Sun');
export const Trash2 = createDualMingcute(Delete2Reg, Delete2Fil, 'Trash2');
export const Upload = createDualMingcute(Upload2Reg, Upload2Fil, 'Upload');
export const UserRound = createDualMingcute(User3Reg, User3Fil, 'UserRound');
export const X = createDualMingcute(CloseReg, CloseFil, 'X');
