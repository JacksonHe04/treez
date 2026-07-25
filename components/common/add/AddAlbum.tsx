'use client';

import React from 'react';
import { Form, Input, DatePicker, Button, Card } from 'antd';
import { useAppDispatch } from '@/store/hooks';
import { addAlbum } from '@/store/slices/albumSlice';
import dayjs from 'dayjs';

/**
 * AddAlbum 组件 - 用于新增专辑
 * 包含以下字段：
 * - name: 专辑名称
 * - artist: 艺术家
 * - releaseDate: 发行日期
 * - addType: 固定为 'album'
 */
interface AddAlbumFormData {
  name: string;
  artist: string;
  releaseDate: string;
  addType: 'album';
}

const AddAlbum: React.FC = () => {
  const [form] = Form.useForm<AddAlbumFormData>();
  const dispatch = useAppDispatch();

  const onFinish = (values: AddAlbumFormData) => {
    // 确保日期值被正确转换为字符串
    const formattedValues = {
      ...values,
      releaseDate: values.releaseDate
        ? dayjs(values.releaseDate).format('YYYY-MM-DD')
        : '',
    };

    dispatch(
      addAlbum({
        id: Date.now().toString(),
        ...formattedValues,
      })
    );
    form.resetFields();
  };

  return (
    <Card title="新增专辑" className="max-w-sm">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          addType: 'album',
          releaseDate: undefined, // 确保初始值为 undefined
        }}
      >
        <Form.Item
          name="name"
          label="专辑名称"
          rules={[{ required: true, message: '请输入专辑名称' }]}
        >
          <Input placeholder="请输入专辑名称" />
        </Form.Item>

        <Form.Item
          name="artist"
          label="艺术家"
          rules={[{ required: true, message: '请输入艺术家名称' }]}
        >
          <Input placeholder="请输入艺术家名称" />
        </Form.Item>

        <Form.Item
          name="releaseDate"
          label="发行日期"
          rules={[{ required: true, message: '请选择发行日期' }]}
        >
          <DatePicker className="w-full" placeholder="请选择发行日期" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" className="w-full">
            提交
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AddAlbum;
