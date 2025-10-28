// 存储当前控制的视频元素
let currentVideos = new Set()

// 初始化
function initialize() {
  findAndStoreVideos()
  setupMutationObserver()
}

// 查找并存储视频元素
function findAndStoreVideos() {
    currentVideos.clear()
    const videos = document.querySelectorAll('video')
    videos.forEach(video => currentVideos.add(video))
}

// 设置DOM变化监听
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.tagName === 'VIDEO') {
              currentVideos.add(node)
            } else if (node.querySelectorAll) {
              node.querySelectorAll('video').forEach(video => currentVideos.add(video))
            }
          }
        })
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// 设置播放速率
function setPlaybackRate(rate) {
  const speed = parseFloat(rate)
  if (isNaN(speed) || speed <= 0) return
  
  currentVideos.forEach(video => {
    try {
      video.playbackRate = speed
    } catch (error) {
      console.warn('Failed to set playback rate:', error)
    }
  })
  
  return { success: true, speed, videoCount: currentVideos.size }
}

// 获取当前播放速率
function getCurrentSpeed() {
  if (currentVideos.size === 0) return { speed: 1.0, videoCount: 0 }
  const firstVideo = Array.from(currentVideos)[0]
  return { 
    speed: firstVideo.playbackRate || 1.0, 
    videoCount: currentVideos.size 
  }
}

// 新增：重新查找视频元素，返回当前状态
function detectVideos() {
  findAndStoreVideos()
  return getCurrentSpeed()
}

// 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'setSpeed':
      sendResponse(setPlaybackRate(request.speed))
      break
    case 'getSpeed':
      sendResponse(getCurrentSpeed())
      break
    case 'detectVideos': // 新增 action 支持
      sendResponse(detectVideos())
      break
    default:
      sendResponse({ error: 'Unknown action' })
  }
  return true // 保持消息通道开放
})

// 初始化
initialize()