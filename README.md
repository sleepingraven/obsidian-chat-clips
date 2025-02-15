<!--
 * @Author       sleepingraven
 * @Date         2024-12-30 17:05:32
 * @LastEditors  sleepingraven
 * @LastEditTime 2025-02-15 12:46:10
 * @FilePath     \chat-clips\README.md
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# Obsidian Chat Clips

This plugin allows record chat in markdown list in *editing view*, and display comments-like layout in *reading view*.

## Example

Editing view:

``` markdown
1. #chatclips
2. p 1
	- What's the weather today?
		- Today's weather is sunny with a high temperature of 9°C and a low temperature of -2°C. The wind is from the northwest at level 3, and the relative humidity is 22%. The UV index is strong, and the air quality is moderate with an AQI of 54.
			- Thank you!
```

Reading view:

[Reading view example](assets/reading-view-example.png)

## Usage

### Define a chat clips list

A chat clips list is defined by:

1. an ordered list at first level.
   - first list item is to indicate chat clips.
   - other list items are recognized as [chat clips commands](#chat-clips-commands).
2. chat contents are start at the second level.

### Chat clips commands

| Name | Description                 | Pattern           |
| ---- | --------------------------- | ----------------- |
| Page | Group sublists into a page. | p \<page-number\> |

## installation
