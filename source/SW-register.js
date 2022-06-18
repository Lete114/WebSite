(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((result) => {
        // 判断是否安装了sw
        if (!localStorage.getItem('installSW')) {
          localStorage.setItem('installSW', true)
          // 这里就不用清理setInterval了，因为页面刷新后就没有了
          setInterval(() => {
            // 判断sw安装后，是否处于激活状态，激活后刷新页面
            if (result && result.active && result.active.state === 'activated') {
              location.reload()
            }
          }, 100)
        }
      })
      .catch((err) => {
        console.log(err)
      })
  }
})()
