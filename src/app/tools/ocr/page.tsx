'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OCRResult } from '@/app/api/v1/ocr/route';

enum OcrStatus {
  idle = 'idle',
  loading = 'loading',
  success = 'success',
  error = 'error',
}

export default function Ocr() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 新增预览URL状态
  const [error, setError] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>(OcrStatus.idle);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setOcrResult(null);
    setOcrStatus(OcrStatus.idle);

    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError('仅支持图片文件格式');
        return;
      }

      // 验证文件大小（2MB限制）
      if (file.size > 2 * 1024 * 1024) {
        setError('文件大小不能超过2MB');
        return;
      }

      // 生成预览URL并清理旧URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedFile(file);

      // 读取文件为Base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1]; // 去除data:image/...;base64,前缀

        // 发送OCR请求
        setOcrStatus(OcrStatus.loading);
        fetch('/api/v1/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64 }),
        })
          .then(response => {
            if (!response.ok) throw new Error('OCR处理失败');
            return response.json();
          })
          .then((data: OCRResult) => {
            setOcrStatus(OcrStatus.success);
            setOcrResult(data);
          })
          .catch(error => {
            setOcrStatus(OcrStatus.error);
            setError(error.message || 'OCR请求失败');
          });
      };

      reader.onerror = () => {
        setError('文件读取失败');
      };

      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <main className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <Input type="file" onChange={onInputChange} className="cursor-pointer mx-auto w-fit" accept="image/*" />
          <p className="text-sm text-gray-500 mt-2">支持 PNG, JPG, JPEG 格式</p>
        </div>

        {selectedFile && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">已选择文件：</h3>
            <p className="text-sm">
              {selectedFile.name} - {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      </main>

      {/* 识别结果展示区 */}
      {previewUrl && (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-l font-semibold mb-4">原始图片</h2>

          {/* 图片预览 */}
          <div className="mb-6">
            <Image
              src={previewUrl}
              alt="OCR识别源图"
              width={640}
              height={400}
              className="max-h-60 w-auto mx-auto rounded-lg border border-gray-200"
              unoptimized
              onLoad={() => previewUrl && URL.revokeObjectURL(previewUrl)} // 释放对象URL
            />
          </div>

          {/* 文字识别结果 */}
          <h2 className="text-l font-semibold mb-4">识别结果</h2>
          {ocrStatus === OcrStatus.success &&
            (ocrResult && ocrResult.result.ocr_response.length > 0 ? (
              <div className="space-y-4">
                {/* 合并文本展示区块 */}
                <h3 className="text-sm font-medium text-gray-500">合并文本</h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors relative group">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ocrResult.result.ocr_response.map(item => item.text).join(' '));
                    }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <div className="whitespace-pre-wrap break-words">{ocrResult.result.ocr_response.map(item => item.text).join(' ')}</div>
                </div>
                {/* 分段文本详情 */}
                <h3 className="text-sm font-medium text-gray-500">文本详情</h3>
                <div className="grid grid-cols-1 gap-3">
                  {ocrResult.result.ocr_response.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors relative group">
                      <button
                        onClick={() => navigator.clipboard.writeText(item.text)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <div className="flex justify-between items-start pr-6">
                        <span className="font-medium">{item.text}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        位置: L{item.left.toFixed(0)} T{item.top.toFixed(0)} R{item.right.toFixed(0)} B{item.bottom.toFixed(0)}
                        <Badge className="ml-2">置信度 {(item.rate * 100).toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">未识别到有效文本</div>
            ))}
        </div>
      )}
    </div>
  );
}
