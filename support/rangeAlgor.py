import operator

l = [(1, 6), (3, 8), (12, 15), (13, 19), (14, 16), (2, 10)]

lower_bounds = []
upper_bounds = []

for pair in l:
    lower_bounds.append(pair[0])
    upper_bounds.append(pair[1])

count_table_lower = {}
count_table_upper = {}


def intoTable(li, dic):
    global l

    for i in li:
        for p in l:
            if i >= p[0] and i <= p[1]:
                if i in dic:
                    dic[i] = dic[i] + 1
                else:
                    dic[i] = 1

    return dic


count_table_upper = intoTable(upper_bounds, count_table_upper)
count_table_lower = intoTable(lower_bounds, count_table_lower)

x = max(count_table_lower.items(), key=operator.itemgetter(1))
y = max(count_table_upper.items(), key=operator.itemgetter(1))
# print(str(count_table_upper))
# print(str(count_table_lower))
print((x[0], y[0]))
