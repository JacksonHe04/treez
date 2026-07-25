'use client';

import { useEffect, useState } from 'react';
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
import {
  getTreezBrowserUser,
  treezLoginPath,
  treezLogoutPath,
  type TreezBrowserUser,
} from '@/lib/auth/browser';

const { Header, Sider, Content } = Layout;

export default function BasicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<TreezBrowserUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    getTreezBrowserUser().then((currentUser) => {
      setUser(currentUser);
      setIsLoadingUser(false);
    });
  }, []);

  // 处理菜单配置，添加图标组件
  const siderMenuItems = processMenuItems(menuConfig.siderMenu);
  const userMenuItems = processMenuItems(menuConfig.userMenu);

  const handleMenuClick = ({ key }: { key: string }) => {
    const prefixes: Record<string, string> = {
      home: 'basic',
      about: 'basic',
      ranking: 'basic',
      result: 'basic',
      collection: 'user',
      follow: 'user',
      rated: 'user',
      setting: 'user',
      albums: 'music',
      artists: 'music',
      songs: 'music',
      issues: 'community',
      playground: 'community',
      vote: 'community',
    };
    const prefix = prefixes[key];
    if (prefix) {
      router.push(`/${prefix}/${key}`);
    }
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      window.location.href = treezLogoutPath('/');
      return;
    }
    if (key === 'settings') {
      router.push('/user/setting');
      return;
    }
    if (key === 'about') router.push('/basic/about');
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
            {isLoadingUser ? (
              <span className="text-gray-400">加载账号…</span>
            ) : user ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push('/user/me')}
                  className="flex cursor-pointer items-center gap-2 border-0 bg-transparent"
                >
                  <Avatar icon={<UserOutlined />} />
                  <span>{user.username ?? user.email}</span>
                </button>
              </>
            ) : (
              <Button
                type="primary"
                onClick={() => {
                  window.location.href = treezLoginPath(pathname || '/');
                }}
              >
                登录 iNon
              </Button>
            )}
            <Button type="text" icon={<BellOutlined />} />
            {user && (
              <Dropdown
                menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                trigger={['click']}
              >
                <Button type="text" icon={<MenuOutlined />} />
              </Dropdown>
            )}
          </Space>
        </Header>

        <Content className="m-4 p-8 bg-white">{children}</Content>
      </Layout>
    </Layout>
  );
}
