import { requireTreezPage } from '@/lib/auth/viewer';

export default async function Me() {
  const viewer = await requireTreezPage('/user/me');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">iNon 账号</h1>
        <p className="mt-2 text-gray-500">
          Treez 与其他 iNon 项目共享同一套账号与登录会话。
        </p>
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 rounded-lg border border-gray-200 p-6">
        <dt className="text-gray-500">邮箱</dt>
        <dd>{viewer.session.email}</dd>
        <dt className="text-gray-500">用户名</dt>
        <dd>{viewer.session.username ?? '尚未设置'}</dd>
        <dt className="text-gray-500">Treez 身份</dt>
        <dd>{viewer.isAdmin ? '项目管理员' : '普通成员'}</dd>
      </dl>
      <a
        href="https://inon.space/sso/account"
        className="inline-flex rounded-md bg-black px-4 py-2 text-white"
      >
        管理 iNon 账号
      </a>
    </div>
  );
}
