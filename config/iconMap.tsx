import {
  HomeOutlined,
  UserOutlined,
  HeartOutlined,
  StarOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  ShareAltOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

/**
 * 图标映射对象
 * 用于将字符串类型的图标名称映射到对应的 React 图标组件
 */
export const iconMap: { [key: string]: React.ReactNode } = {
  HomeOutlined: <HomeOutlined />,
  UserOutlined: <UserOutlined />,
  HeartOutlined: <HeartOutlined />,
  StarOutlined: <StarOutlined />,
  PlayCircleOutlined: <PlayCircleOutlined />,
  TeamOutlined: <TeamOutlined />,
  ShareAltOutlined: <ShareAltOutlined />,
  SettingOutlined: <SettingOutlined />,
  InfoCircleOutlined: <InfoCircleOutlined />,
  QuestionCircleOutlined: <QuestionCircleOutlined />,
  LogoutOutlined: <LogoutOutlined />,
};

interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  children?: MenuItem[];
  [key: string]: unknown;
}

interface RawMenuItem {
  key: string;
  icon?: string;
  label?: string;
  children?: RawMenuItem[];
  [key: string]: unknown;
}

/**
 * 处理菜单配置，添加图标组件
 * @param items 菜单配置项数组
 * @returns 处理后的菜单配置项数组
 */
export const processMenuItems = (items: RawMenuItem[]): MenuItem[] => {
  return items.map((item) => ({
    ...item,
    icon: item.icon ? iconMap[item.icon] : undefined,
    children: item.children ? processMenuItems(item.children) : undefined,
  }));
};
