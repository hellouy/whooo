
/**
 * 检测Whoiser导入问题的调试工具
 * 尝试探测whoiser库导入失败的原因
 */
export async function debugWhoiserImport(): Promise<string> {
  try {
    // 尝试直接导入whoiser
    const whoiser = await import('whoiser');
    return `Whoiser导入成功: ${whoiser ? '已加载' : '未知问题'}`;
  } catch (error: any) {
    // 捕获并分析错误
    let errorReport = `Whoiser导入错误: ${error.message}\n`;
    
    // 检查错误类型
    if (error.message.includes('Cannot find module')) {
      errorReport += "原因: 找不到whoiser模块。可能未正确安装依赖。\n";
      errorReport += "建议: 尝试运行 'npm install whoiser' 或 'yarn add whoiser'";
    } else if (error.message.includes('dynamic import')) {
      errorReport += "原因: 动态导入语法不受支持。\n";
      errorReport += "建议: 可能需要更新构建配置以支持动态导入。";
    } else if (error.message.includes('Window is not defined') || error.message.includes('document is not defined')) {
      errorReport += "原因: 尝试在浏览器环境中加载node.js模块。\n";
      errorReport += "建议: 使用isomorphic库或确保仅在服务器端导入。";
    }
    
    // 尝试检查是否有其他网络相关依赖可用
    try {
      const axios = await import('axios');
      errorReport += "\nAxios可用: ✓";
    } catch (e) {
      errorReport += "\nAxios不可用: ✗";
    }
    
    return errorReport;
  }
}

/**
 * 检测网络连接问题
 */
export async function testNetworkConnection(): Promise<string> {
  try {
    const startTime = Date.now();
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD', 
      mode: 'no-cors',
      cache: 'no-cache'
    });
    const endTime = Date.now();
    return `网络连接正常: 延迟 ${endTime - startTime}ms`;
  } catch (error: any) {
    return `网络连接问题: ${error.message}`;
  }
}
