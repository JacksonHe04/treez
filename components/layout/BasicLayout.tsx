'use client';

import { Layout, Menu, Input, Avatar, Dropdown, Button, Space } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import {
  UserOutlined,
  SearchOutlined,
  BellOutlined,
  LeftOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { processMenuItems } from '@/config/iconMap';
import menuConfig from '@/config/menu.json';

const { Header, Sider, Content } = Layout;

export default function BasicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // 处理菜单配置，添加图标组件
  const siderMenuItems = processMenuItems(menuConfig.siderMenu);
  const userMenuItems = processMenuItems(menuConfig.userMenu);

  // 处理菜单点击事件 - 跳转到 /basic/{key} 或 /{key}
  const handleMenuClick = ({ key }: { key: string }) => {
    // 根据路径前缀决定跳转位置
    if (
      [
        'home',
        'about',
        'me',
        'login',
        'signup',
        'setting',
        'collection',
        'rated',
        'ranking',
        'result',
        'issues',
        'playground',
        'vote',
        'albums',
        'artists',
        'songs',
        'follow',
      ].includes(key)
    ) {
      router.push(`/basic/${key}`);
    } else {
      router.push(`/${key}`);
    }
  };

  // 根据当前路径获取 selectedKey
  const pathSegment = pathname?.split('/').filter(Boolean).pop() || 'home';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} className="bg-white">
        <div className="h-16 flex items-center justify-center">
          <span className="text-lg font-bold">treez</span>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['home']}
          defaultOpenKeys={['my', 'music', 'community']}
          selectedKeys={[pathSegment]}
          items={siderMenuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header className="bg-white px-4 flex items-center justify-between">
          <Space>
            <Button type="text" icon={<LeftOutlined />} />
          </Space>
          <Space size="middle">
            <Input
              placeholder="搜索"
              prefix={<SearchOutlined />}
              className="w-48"
            />
            <Avatar icon={<UserOutlined />} />
            <span>用户名</span>
            <Button type="text" icon={<BellOutlined />} />
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button type="text" icon={<MenuOutlined />} />
            </Dropdown>
          </Space>
        </Header>

        <Content className="m-4 p-8 bg-white">{children}</Content>
      </Layout>
    </Layout>
  );
}
