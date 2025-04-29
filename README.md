# Graffey

Graffey is a GPU-powered graphing calculator built using WebGL and Bootstrap.

## Controls

Hold left click and drag to move the view around.  
Scroll the mouse wheel to zoom in and out.  
Hold middle click and drag to zoom along one axis.  
Left click and drag vertically on the bottom right corner of input areas to adjust their size.  
Most buttons have tooltips describing what they do when you hover over them with the mouse.  

## Rendering

Like most online graphing calculators, Graffey is capable of graphing arbitrary equations. It will render lines and curves using the primary color.

Graffey also has a colormap rendering mode that can be used to render expressions. Values with a greater magnitude are represented using brighter colors, with black being 0. Positive values use the primary color and negative values use an otherwise hidden secondary color. NaN is detected and rendered as a checkerboard. This mode also renders white isolines at 0 and every whole positive and negative power of 2 (...-8, -4, -2, -1, 0, 1, 2, 4, 8...).

It is also possible to write custom functions using Graffey, but they will not be rendered unless they are used in an expression or equation.

## Syntax

Graffey works by converting equations and expressions into GLSL functions, but it does minimal preprocessing. This means that Graffey is syntactically similar to GLSL in many ways. However, one key difference is that all integer literals (`-3`, `58`, etc) are automatically converted to floating point literals (`-3.0`, `58.0`, etc). Also, unlike most graphing calculators, the ^ operator does not exponentiate. That operator is the bitwise XOR operator in GLSL, but `pow()` works fine. `pow(x,2)` is equivalent to x².

If there is a single equals sign (`=`) present, Graffey assumes you are graphing an equation and will use the equation rendering mode. For example, `x*x+y*y=1` will render a unit circle and `y=x*x` will graph a parabola.

To use the colormap mode, just give it an expression with no equals sign. For instance, `max(abs(x),abs(y))-1` will display a square with negative values smoothly transitioning to positive outside the square, while `sin(x*y)` will show something that's sort of hard to describe. Try it yourself!

A custom function is detected by the presence of `=>`. A function can be created using the syntax `name(arg1, arg2, ...)=>expression`. For example, creating a function such as `glow(a,b,stren)=>stren/(a*a+b*b)` will allow you to then render the expression `glow(x-1,y-3,1)+glow(x-3,y-2,-2)`. The values of x and y can also be accessed inside of functions directly, so another way of writing this function and expression would be `glow(a,b,stren)=>stren/((x-a)*(x-a)+(y-b)*(y-b))` and `glow(1,3,1)+glow(3,2,-2)` respectively. 

The presence of a semicolon (`;`) will disable preprocessing for the function body, allowing you to write more complicated functions in pure GLSL. This allows you to use advanced features like loops, but requires knowledge of GLSL:

	squareSum(n)=>
	float sum = 0.0;
	for(float i = 0.0; i < n; i++) {
		sum += i*i;
	}
	return sum;

## Available Functions, Constants, and Variables

Because of the minimal preprocessing, math functions that are part of GLSL should all work here. Graffey also provides some extra functions and constants.

pi = 3.1415926536  
tau = 6.2831853072  
e = 2.7182818285  

`rand()` accepts 0 to 4 arguments and returns a pseudo-random number between 0 and 1 that will be the same any time the exact same arguments are entered. If needed, make use of GLSL's built-in `round()` function to make the results consistent, like `y=rand(round(x))`. If no arguments are given, it will return the next number in a random sequence each time it is called. This function can be re-randomized by clicking the dice button. It is important to note that `rand()` is specifically designed to treat -0.0 and 0.0 as the same value.

`time` holds the amount of time, in seconds, since the timer was last reset. This can be done manually and will also occur automatically when recompilation finds `time` present and did not find it last time. Using `time` will prevent temporal accumulation, leading to less pixel-level smoothness in graphs.