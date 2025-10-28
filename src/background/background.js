// 快捷键命令处理
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (!tab) return
    
    let message
    switch (command) {
      case 'increase_speed':
        message = { action: 'increaseSpeed' }
        break
      case 'decrease_speed':
        message = { action: 'decreaseSpeed' }
        break
      case 'reset_speed':
        message = { action: 'setSpeed', speed: 1.0 }
        break
    }
    
    if (message) {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (response && response.success) {
          console.log(`Command ${command} executed successfully`)
        }
      })
    }
  } catch (error) {
    console.error('Error executing command:', error)
  }
})

// 标签页更新监听
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // 可以在这里注入内容脚本或执行其他初始化
  }
})