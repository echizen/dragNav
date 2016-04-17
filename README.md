# dragNav


移动端具有拖拽滚动效果的导航条或者滚轴

## function

实现拖拽滚动效果，元素根据拖动的手指移动，到了一定的阈值后即使停止拖拽也会滚到对应的元素位置。

分为规则和不规则区域2种情况，规则区域所有被拖拽滚动的元素单元等宽有序，不规则区域会在拖拽区域单元之间夹杂无效装饰性元素。

- 规则区域
  ![image](http://7xt2ii.com2.z0.glb.clouddn.com/image/jpg/QQ20160417-1@2x.png)
- 不规则区域
	![image](http://7xt2ii.com2.z0.glb.clouddn.com/image/jpg/QQ20160417-0@2x.png)

## use

`selector.dragNav(settings);`

for example:

	$("#wrap").dragNav({
	   pageClass:'item',
	   pageContainer:'.item-list',
	   itemWidth: 100
	 });
	 
## option

 - itemClass: 将要被移动的拖拽元素单元的class名称
 - wrap:包含拖拽元素滚动单元的区域选择器
 - onSwipeStart: 在拖拽滚动的动画开始前被触发的函数
 - onSwipeEnd: 在拖拽滚动的动画完成后被触发的函数
 - onDragStart: 拖拽开始时（touchStart）的回调函数
 - onDrag: 拖拽过程中(touchMove)的回调函数
 - onDragEnd:拖拽结束后(touchEnd)的回调函数
 - duration:滚动动画延时时间
 - stopPropagation:是否阻止touch事件的冒泡
 - afterInitialize: 在涉及元素样式初始化完成后的回调函数
 - itemBorder: 每一屏滚动的值，也是每个拖拽元素单元滚到中间时，边界区域的滚动值。
 - itemWidth:每个拖拽元素单元的宽度值
 - wrapBorder: :包含拖拽元素滚动单元的区域宽度
 
## attention
 
 1. 示例是提供拖拽元素到页面中间位置的效果。具体滚动到哪个位置由itemBorder的值决定，所拟你可以自定义位置。
 2. 如果是滚动每个元素到屏幕中间的效果，最好dom中item元素首尾补几个占位样式元素。已达到更好的视觉效果。 
 3. item即每个滚动单元的宽度需要为整数值，否则clentWidth或者jquery的width取到的是四舍五入的整数值导致滚动后定位的偏差。