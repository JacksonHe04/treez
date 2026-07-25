import BasicLayout from '@/components/layout/BasicLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <BasicLayout>{children}</BasicLayout>;
}
