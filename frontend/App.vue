<script>
	import { useAuth } from '@/composables/useAuth.js'
	import { startReminderScheduler, stopReminderScheduler } from '@/composables/useReminders.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			const { requireLogin } = useAuth()
			if (requireLogin()) startReminderScheduler()
		},
		onShow: function() {
			console.log('App Show')
			const { loadSession } = useAuth()
			if (loadSession()) startReminderScheduler()
		},
		onHide: function() {
			console.log('App Hide')
			stopReminderScheduler()
		}
	}
</script>

<style lang="scss">
/* 全局公共样式 */
page {
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
	font-size: 28rpx;
	color: #172033;
	background-color: #F6F7FC;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
}

/* 全局滚动条美化（H5） */
::-webkit-scrollbar {
	width: 4px;
}
::-webkit-scrollbar-thumb {
	background: rgba(51, 85, 204, 0.22);
	border-radius: 2px;
}

/* 禁止文字选中时的默认蓝色高亮 */
view, text {
	-webkit-tap-highlight-color: transparent;
}

view, input, textarea {
	box-sizing: border-box;
}
</style>
