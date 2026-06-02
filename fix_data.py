import json, re

with open("js/data.js", "r", encoding="utf-8") as f:
    data = f.read()

# 找到空的c字段 - 它们应该是什么？
# épure: 香港置地广场
# Arbor: 香港中环

# 直接在字符串中替换
old1 = '"n":"\\u00e9pure","y":2019,"la":22.29583,"lo":114.169304,"c":"","r":"Hong Kong"'
new1 = '"n":"\\u00e9pure","y":2019,"la":22.29583,"lo":114.169304,"c":"Hong Kong","r":"Hong Kong"'

old2 = '"n":"Arbor","y":2019,"la":22.283146,"lo":114.15542,"c":"","r":"Hong Kong"'
new2 = '"n":"Arbor","y":2019,"la":22.283146,"lo":114.15542,"c":"Hong Kong","r":"Hong Kong"'

data = data.replace(old1, new1).replace(old2, new2)

with open("js/data.js", "w", encoding="utf-8") as f:
    f.write(data)

print("Done - fixed empty cities")
