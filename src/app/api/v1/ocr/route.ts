import { NextResponse } from 'next/server'

// OCR响应项类型
interface OCRResponseItem {
  bottom: number;
  left: number;
  rate: number;
  right: number;
  text: string;
  top: number;
}

// 完整结果类型
export interface OCRResult {
  result: {
    errcode: number;
    height: number;
    imgpath: string;
    ocr_response: OCRResponseItem[];
    width: number;
  };
}

export async function POST(request: Request) {
  try {
    // 验证请求内容类型
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: '请求必须使用JSON格式' },
        { status: 415 }
      )
    }

    // 解析请求体
    const body = await request.json()
    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { error: '缺少必要参数: image (string类型)' },
        { status: 400 }
      )
    }

    // 转发请求到OCR服务
    const ocrResponse = await fetch('http://124.222.244.200:5000/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ image: body.image }),
    })

    // 处理OCR服务响应
    if (!ocrResponse.ok) {
      const error = await ocrResponse.text()
      return NextResponse.json(
        { error: `OCR服务请求失败: ${error}` },
        { status: ocrResponse.status }
      )
    }

    // 返回OCR结果（使用类型断言确保数据结构正确）
    const data: OCRResult = await ocrResponse.json()
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST'
      }
    })

  } catch (error) {
    // 异常处理
    console.error('OCR代理请求异常:', error)
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    )
  }
}

// 添加OPTIONS方法处理CORS预检请求
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
