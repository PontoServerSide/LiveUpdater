TARGET = git_checker
OBJS = git_checker.o
LDFLAGS = $(shell pkg-config --libs libgit2)
CFLAGS = $(shell pkg-config --cflags libgit2)

$(TARGET): $(OBJS)
	gcc $(LDFLAGS) -o $@ $^ -lgit2
.c.o:
	gcc $(CFLAGS) -g -c $<

clean:
	rm *.o
	rm $(TARGET)