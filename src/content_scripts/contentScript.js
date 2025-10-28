// 存储当前控制的视频元素
let currentVideos = new Set()

// 初始化
function initialize() {
  findAndStoreVideos()
  setupMutationObserver()
  setupVideoEventListeners()
}

// 查找并存储视频元素
function findAndStoreVideos() {
  const videos = document.querySelectorAll('video')
  videos.forEach(video => {
    if (!currentVideos.has(video)) {
      currentVideos.add(video)
      setupVideoListeners(video)
    }
  })
  console.log(`Found ${videos.length} video elements`)
}

// 设置DOM变化监听
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldCheckVideos = false
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'VIDEO') {
              currentVideos.add(node)
              setupVideoListeners(node)
            } else if (node.querySelectorAll) {
              const videos = node.querySelectorAll('video')
              videos.forEach(video => {
                currentVideos.add(video)
                setupVideoListeners(video)
              })
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

// 为视频元素设置监听器
function setupVideoListeners(video) {
  // 防止重复添加监听器
  if (video._velocityControlListeners) return
  
  video._velocityControlListeners = true
  
  // 监听视频被移除
  const removeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === video || node.contains?.(video)) {
          currentVideos.delete(video)
          removeObserver.disconnect()
        }
      })
    })
  })
  
  if (video.parentNode) {
    removeObserver.observe(video.parentNode, { childList: true })
  }
}

// 设置播放速率
function setPlaybackRate(rate) {
  const speed = parseFloat(rate)
  if (isNaN(speed) || speed <= 0) return
  
  console.log(`Setting playback rate to ${speed}x for ${currentVideos.size} videos`)
  
  currentVideos.forEach(video => {
    try {
      video.playbackRate = speed
      // 存储自定义属性以便恢复
      video.dataset.originalPlaybackRate = video.playbackRate
    } catch (error) {
      console.warn('Failed to set playback rate for video:', error)
    }
  })
  
  return { success: true, speed, videoCount: currentVideos.size }
}

// 获取当前播放速率
function getCurrentSpeed() {
  if (currentVideos.size === 0) {
    return { speed: 1.0, videoCount: 0 }
  }
  
  // 返回第一个视频的速率（假设同步控制）
  const firstVideo = Array.from(currentVideos)[0]
  return { 
    speed: firstVideo.playbackRate || 1.0, 
    videoCount: currentVideos.size 
  }
}

// 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'setSpeed':
      const result = setPlaybackRate(request.speed)
      sendResponse(result)
      break
      
    case 'getSpeed':
      const speedInfo = getCurrentSpeed()
      sendResponse(speedInfo)
      break
      
    case 'increaseSpeed':
      const current = getCurrentSpeed()
      const newSpeed = Math.min(current.speed + 0.25, 5.0)
      const increaseResult = setPlaybackRate(newSpeed)
      sendResponse(increaseResult)
      break
      
    case 'decreaseSpeed':
      const current2 = getCurrentSpeed()
      const newSpeed2 = Math.max(current2.speed - 0.25, 0.25)
      const decreaseResult = setPlaybackRate(newSpeed2)
      sendResponse(decreaseResult)
      break
      
    default:
      sendResponse({ error: 'Unknown action' })
  }
  
  return true // 保持消息通道开放用于异步响应
})

// 初始化
initialize()