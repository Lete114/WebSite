const origin = [
  "https://www.imlete.cn",
  "https://www.lete114.top",
  "https://www.4everland.app",
  "https://homes.vercel.app",
];

const cdn = {
  gh: {
    jsdelivr: "https://cdn.jsdelivr.net/gh",
    pigax_jsd: "https://u.pigax.cn/gh",
    pigax_chenyfan_jsd: "https://cdn-jsd.pigax.cn/gh",
    tianli: "https://cdn1.tianli0.top/gh",
  },
  combine: {
    jsdelivr: "https://cdn.jsdelivr.net/combine",
    pigax_jsd: "https://u.pigax.cn/combine",
    pigax_chenyfan_jsd: "https://cdn-jsd.pigax.cn/combine",
    tianli: "https://cdn1.tianli0.top/combine",
  },
  npm: {
    eleme: "https://npm.elemecdn.com",
    jsdelivr: "https://cdn.jsdelivr.net/npm",
    zhimg: "https://unpkg.zhimg.com",
    unpkg: "https://unpkg.com",
    pigax_jsd: "https://u.pigax.cn/npm",
    pigax_unpkg: "https://unpkg.pigax.cn/",
    pigax_chenyfan_jsd: "https://cdn-jsd.pigax.cn/npm",
    tianli: "https://cdn1.tianli0.top/npm",
  },
};

self.addEventListener("install", async (event) => {
  await self.skipWaiting();
});

self.addEventListener("activate", async (event) => {
  await self.clients.claim();
});

self.addEventListener("fetch", async (event) => {
  handleRequest(event.request)
    .then((result) => event.respondWith(result))
    .catch(() => 0);
});

// 返回响应
async function progress(res) {
  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: res.headers,
  });
}

function handleRequest(req) {
  const urls = [];
  const urlStr = req.url;
  let urlObj = new URL(urlStr);
  // 为了获取 cdn 类型
  // 例如获取gh (https://cdn.jsdelivr.net/gh)
  const path = urlObj.pathname.split("/")[1];

  // 匹配 cdn
  for (const type in cdn) {
    if (type === path) {
      for (const key in cdn[type]) {
        const url = cdn[type][key] + urlObj.pathname.replace("/" + path, "");
        urls.push(url);
      }
    }
  }

  // 如果上方 cdn 遍历 匹配到 cdn 则直接统一发送请求
  if (urls.length) return fetchAny(urls);

  // 将用户访问的当前网站与所有源站合并
  let origins = [location.origin, ...origin];

  // 遍历判断当前请求是否是源站主机
  const is = origins.find((i) => {
    const { hostname } = new URL(i);
    const reg = new RegExp(hostname);
    return urlStr.match(reg);
  });

  // 不是源站则直接请求返回结果
  if (!is) return fetch(urlStr).then(progress);

  // 如果以上都不是，则将当前访问的url参数追加到所有源站后，统一请求。
  // 谁先返回则使用谁的返回结果
  origins = origins.map((i) => i + urlObj.pathname + urlObj.search);
  return fetchAny(origins);
}

// Promise.any 的 polyfill
function createPromiseAny() {
  Promise.any = function (promises) {
    return new Promise((resolve, reject) => {
      promises = Array.isArray(promises) ? promises : [];
      let len = promises.length;
      let errs = [];
      if (len === 0)
        return reject(new AggregateError("All promises were rejected"));
      promises.forEach((p) => {
        if (!p instanceof Promise) return reject(p);
        p.then(
          (res) => resolve(res),
          (err) => {
            len--;
            errs.push(err);
            if (len === 0) reject(new AggregateError(errs));
          }
        );
      });
    });
  };
}

// 发送所有请求
function fetchAny(urls) {
  // 中断一个或多个请求
  const controller = new AbortController();
  const signal = controller.signal;

  // 遍历将所有的请求地址转换为promise
  const PromiseAll = urls.map((url) => {
    return new Promise(async (resolve, reject) => {
      fetch(url, { signal })
        .then(progress)
        .then((res) => {
          const r = res.clone();
          if (r.status !== 200) reject(null);
          controller.abort(); // 中断
          resolve(r);
        })
        .catch(() => reject(null));
    });
  });

  // 判断浏览器是否支持 Promise.any
  if (!Promise.any) createPromiseAny();

  // 谁先返回"成功状态"则返回谁的内容，如果都返回"失败状态"则返回null
  return Promise.any(PromiseAll)
    .then((res) => res)
    .catch(() => null);
}
